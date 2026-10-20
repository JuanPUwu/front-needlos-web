import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { mensajeDeError } from '../../../../core/http/api-error';
import { FechaPipe } from '../../../../shared/pipes/fecha.pipe';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { PERIODOS, Periodo } from '../../../resumen/models/resumen.model';
import { fechasDePeriodo } from '../../../resumen/services/resumen.service';
import { InformeCartera } from '../../components/informe-cartera/informe-cartera';
import { InformePrendas } from '../../components/informe-prendas/informe-prendas';
import { InformeProductividad } from '../../components/informe-productividad/informe-productividad';
import { InformeVentas } from '../../components/informe-ventas/informe-ventas';
import { Cartera, PrendasClientes, Productividad, Ventas } from '../../models/informe.model';
import { InformeService } from '../../services/informe.service';
import { recargaAutomatica } from '../../../../core/estado/recarga-automatica';
import { BotonRecargar } from '../../../../shared/ui/boton-recargar/boton-recargar';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { avisoFaltantes } from '../../../../shared/util/faltantes';

/** "Hasta" no puede ser anterior a "Desde". */
function rangoValido(grupo: AbstractControl): ValidationErrors | null {
  const { desde, hasta } = grupo.value as { desde: string; hasta: string };
  return desde && hasta && desde > hasta ? { rangoInvertido: true } : null;
}

/** Un informe: sus datos (null mientras carga) y su error. */
interface Estado<T> {
  datos: T | null;
  error: string | null;
}

const CARGANDO = { datos: null, error: null };

/**
 * Informes (Manual §15; solo SASTRE_ADMIN, solo en pantalla): ventas e ingresos, cartera y
 * entregas (foto de hoy), productividad por sastre, y prendas y clientes. El periodo se elige
 * como en el Resumen y vive en la URL (`?periodo=`, `?desde=&hasta=`); sin parámetros, Hoy.
 */
@Component({
  selector: 'app-informes',
  imports: [
    BotonRecargar,
    Encabezado,
    FechaPipe,
    ReactiveFormsModule,
    InformeVentas,
    InformeCartera,
    InformeProductividad,
    InformePrendas,
  ],
  templateUrl: './informes.html',
  styleUrl: './informes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Informes implements OnInit {
  private readonly service = inject(InformeService);
  private readonly confirmacion = inject(Confirmacion);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Peticiones de una recarga en curso (el botón gira mientras haya alguna). */
  readonly recargando = signal(0);

  readonly periodos = PERIODOS;
  readonly periodo = signal<Periodo>('hoy');
  readonly desde = signal('');
  readonly hasta = signal('');
  readonly rango = inject(FormBuilder).nonNullable.group(
    { desde: ['', Validators.required], hasta: ['', Validators.required] },
    { validators: rangoValido },
  );

  readonly ventas = signal<Estado<Ventas>>(CARGANDO);
  readonly cartera = signal<Estado<Cartera>>(CARGANDO);
  readonly productividad = signal<Estado<Productividad>>(CARGANDO);
  readonly prendas = signal<Estado<PrendasClientes>>(CARGANDO);

  /** Fechas que se están viendo (se conocen antes de que responda el servidor). */
  readonly fechas = computed(() =>
    this.periodo() === 'rango'
      ? { desde: this.desde(), hasta: this.hasta() }
      : fechasDePeriodo(this.periodo() as Exclude<Periodo, 'rango'>),
  );

  constructor() {
    recargaAutomatica(() => this.recargar());
  }

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const periodo = (q.get('periodo') as Periodo | null) ?? 'hoy';
    if (periodo === 'rango' && q.get('desde') && q.get('hasta')) {
      this.desde.set(q.get('desde')!);
      this.hasta.set(q.get('hasta')!);
      this.rango.setValue({ desde: this.desde(), hasta: this.hasta() });
      this.periodo.set('rango');
    } else if (PERIODOS.some((p) => p.valor === periodo) && periodo !== 'rango') {
      this.periodo.set(periodo);
    }
    // La cartera es una foto de hoy: se pide una vez, no cambia con el periodo.
    this.pedir(this.service.cartera(), this.cartera, 'No se pudo cargar la cartera.');
    this.cargar();
  }

  /** Trae lo último sin vaciar las tarjetas. */
  recargar(): void {
    this.cargar(true);
  }

  elegir(periodo: Periodo): void {
    this.periodo.set(periodo);
    if (periodo === 'rango') {
      // Arranca con las fechas que se estaban viendo; se consulta al tocar "Ver".
      this.rango.reset(this.fechas());
      return;
    }
    this.cargar();
  }

  verRango(): void {
    if (this.rango.invalid) {
      this.rango.markAllAsTouched();
      // Qué falta, en un aviso que hay que aceptar (dueño 2026-10-20).
      const aviso = avisoFaltantes(
        this.rango,
        'ver el rango',
        { desde: 'la fecha desde', hasta: 'la fecha hasta' },
        this.rango.hasError('rangoInvertido') ? ['que "Hasta" no sea anterior a "Desde"'] : [],
      );
      if (aviso) {
        void this.confirmacion.avisar(aviso);
      }
      return;
    }
    const { desde, hasta } = this.rango.getRawValue();
    this.desde.set(desde);
    this.hasta.set(hasta);
    this.cargar();
  }

  /** Error en línea de un campo del rango (solo después de tocarlo). */
  errorRango(campo: 'desde' | 'hasta'): string | null {
    const control = this.rango.controls[campo];
    if (!control.touched) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Elige la fecha';
    }
    return campo === 'hasta' && this.rango.hasError('rangoInvertido') ? 'Antes de "Desde"' : null;
  }

  abrirPedido(id: string): void {
    this.router.navigate(['/pedidos'], { queryParams: { pedido: id, estado: '' } });
  }

  verPedidos(filtros: Params): void {
    this.router.navigate(['/pedidos'], { queryParams: filtros });
  }

  private cargar(silencioso = false): void {
    const { desde, hasta } = this.fechas();
    const periodo = this.periodo();
    // La URL refleja lo que se ve (una recarga deja el mismo periodo); Hoy no deja parámetros.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        periodo: periodo === 'hoy' ? null : periodo,
        desde: periodo === 'rango' ? desde : null,
        hasta: periodo === 'rango' ? hasta : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.pedir(
      this.service.ventas(desde, hasta),
      this.ventas,
      'No se pudieron cargar las ventas.',
      silencioso,
    );
    this.pedir(
      this.service.productividad(desde, hasta),
      this.productividad,
      'No se pudo cargar la productividad.',
      silencioso,
    );
    this.pedir(
      this.service.prendasYClientes(desde, hasta),
      this.prendas,
      'No se pudieron cargar las prendas y los clientes.',
      silencioso,
    );
  }

  private pedir<T>(
    peticion: Observable<T>,
    destino: ReturnType<typeof signal<Estado<T>>>,
    mensaje: string,
    silencioso = false,
  ): void {
    // Al recargar se conserva lo que se ve hasta que llega lo nuevo.
    if (silencioso) {
      this.recargando.update((n) => n + 1);
    } else {
      destino.set(CARGANDO);
    }
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (datos) => destino.set({ datos, error: null }),
      error: (err: unknown) => destino.set({ datos: null, error: mensajeDeError(err, mensaje) }),
      complete: () => silencioso && this.recargando.update((n) => n - 1),
    });
  }
}
