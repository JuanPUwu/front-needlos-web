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
import { Subscription } from 'rxjs';
import { filtrosAUrl, filtrosDesdeUrl } from '../../../../core/estado/filtros-url';
import { mensajeDeError } from '../../../../core/http/api-error';
import { FechaPipe } from '../../../../shared/pipes/fecha.pipe';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import { etiquetaMetodo } from '../../../pedidos/models/pedido.model';
import { ResumenMovimientos } from '../../components/resumen-movimientos/resumen-movimientos';
import {
  FILTROS_MOVIMIENTOS_INICIALES,
  FiltrosMovimientos,
  Movimiento,
  PERIODOS,
  Periodo,
  Resumen as ResumenDatos,
  Totales,
} from '../../models/resumen.model';
import { ResumenService, diasEntre, fechasDePeriodo } from '../../services/resumen.service';

const TAMANO_PAGINA = 20;

/** "Hasta" no puede ser anterior a "Desde". */
function rangoValido(grupo: AbstractControl): ValidationErrors | null {
  const { desde, hasta } = grupo.value as { desde: string; hasta: string };
  return desde && hasta && desde > hasta ? { rangoInvertido: true } : null;
}

const CEROS: Totales = { ingresos: 0, devoluciones: 0, egresos: 0, neto: 0 };

/**
 * Resumen (Manual §12.1; solo SASTRE_ADMIN): informativo, cada día arranca en $0. Periodo en la
 * URL (`?periodo=semana`, `?desde=&hasta=` para un rango; sin parámetros siempre es Hoy), igual
 * que los filtros y la página de los movimientos (`?tipo=&metodo=&orden=&pagina=`). Tarjetas de
 * efectivo y transferencias (con detalle por método), día por día y movimientos paginados.
 */
@Component({
  selector: 'app-resumen',
  imports: [
    TituloBloque,
    Encabezado,
    MonedaPipe,
    FechaPipe,
    ResumenMovimientos,
    ReactiveFormsModule,
  ],
  templateUrl: './resumen.html',
  styleUrl: './resumen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Resumen implements OnInit {
  private readonly service = inject(ResumenService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly periodos = PERIODOS;
  readonly etiquetaMetodo = etiquetaMetodo;

  readonly periodo = signal<Periodo>('hoy');
  /** Fechas del rango personalizado consultado (yyyy-MM-dd). */
  readonly desde = signal('');
  readonly hasta = signal('');
  readonly rango = inject(FormBuilder).nonNullable.group(
    { desde: ['', Validators.required], hasta: ['', Validators.required] },
    { validators: rangoValido },
  );

  readonly datos = signal<ResumenDatos | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly filtrosMov = signal<FiltrosMovimientos>(FILTROS_MOVIMIENTOS_INICIALES);
  readonly movimientos = signal<Movimiento[]>([]);
  readonly totalMov = signal(0);
  readonly paginaMov = signal(0);
  readonly totalPaginasMov = signal(0);
  readonly cargandoMov = signal(true);
  readonly errorMov = signal<string | null>(null);
  private peticionMov?: Subscription;

  /** Fechas que se están viendo: se conocen antes de que responda el servidor. */
  readonly fechas = computed(() =>
    this.periodo() === 'rango'
      ? { desde: this.desde(), hasta: this.hasta() }
      : fechasDePeriodo(this.periodo() as Exclude<Periodo, 'rango'>),
  );

  /** Varios días: los movimientos muestran la fecha además de la hora. */
  readonly varios = computed(() => this.fechas().desde !== this.fechas().hasta);

  /**
   * Lo que se pinta: los datos o, mientras llegan, la misma estructura en $0 marcada como
   * esqueleto (mismo marcado = mismo tamaño exacto, Reglas §12.2).
   */
  readonly vista = computed<ResumenDatos | null>(() => {
    const d = this.datos();
    if (d) {
      return d;
    }
    const { desde, hasta } = this.fechas();
    if (!this.cargando() || !desde || !hasta) {
      return null;
    }
    return {
      desde,
      hasta,
      horaInicio: '',
      horaFin: '',
      estado: null,
      total: CEROS,
      efectivo: CEROS,
      transferencias: { ...CEROS, porMetodo: [] },
      dias: diasEntre(desde, hasta).map((fecha) => ({ fecha, ...CEROS })),
    };
  });
  readonly esqueleto = computed(() => !this.datos());

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
    this.filtrosMov.set(filtrosDesdeUrl(q, FILTROS_MOVIMIENTOS_INICIALES));
    this.cargar(Math.max(Number(q.get('pagina')) || 1, 1) - 1);
  }

  elegir(periodo: Periodo): void {
    this.periodo.set(periodo);
    if (periodo === 'rango') {
      // Arranca con el periodo que se estaba viendo; se consulta al tocar "Ver".
      const d = this.datos();
      this.rango.reset({ desde: d?.desde ?? '', hasta: d?.hasta ?? '' });
      return;
    }
    this.cargar();
  }

  verRango(): void {
    if (this.rango.invalid) {
      this.rango.markAllAsTouched();
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

  /** Desde el día por día: ver un solo día. */
  verDia(fecha: string): void {
    this.periodo.set('rango');
    this.desde.set(fecha);
    this.hasta.set(fecha);
    this.rango.reset({ desde: fecha, hasta: fecha });
    this.cargar();
  }

  filtrarMovimientos(cambio: Partial<FiltrosMovimientos>): void {
    this.filtrosMov.update((f) => ({ ...f, ...cambio }));
    this.cargarMovimientos(0);
  }

  limpiarFiltrosMov(): void {
    this.filtrarMovimientos({ tipo: '', metodo: '' });
  }

  irAPaginaMov(pagina: number): void {
    if (pagina >= 0 && pagina < this.totalPaginasMov()) {
      this.cargarMovimientos(pagina);
    }
  }

  /** Un abono abre su pedido; un gasto, su corrección. */
  abrirMovimiento(m: Movimiento): void {
    if (m.tipo === 'GASTO') {
      this.router.navigate(['/gastos'], { queryParams: { gasto: m.id } });
    } else if (m.pedidoId) {
      this.router.navigate(['/pedidos'], { queryParams: { pedido: m.pedidoId, estado: '' } });
    }
  }

  private cargar(paginaMov = 0): void {
    const { desde, hasta } = this.fechas();
    this.datos.set(null);
    this.cargando.set(true);
    this.error.set(null);
    this.service
      .obtener(desde, hasta)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.datos.set(r);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo cargar el resumen.'));
        },
      });
    this.cargarMovimientos(paginaMov);
  }

  private cargarMovimientos(pagina: number): void {
    const { desde, hasta } = this.fechas();
    this.actualizarUrl(pagina);
    this.cargandoMov.set(true);
    this.errorMov.set(null);
    // Si se cambia de filtro antes de que responda, solo cuenta la última petición.
    this.peticionMov?.unsubscribe();
    this.peticionMov = this.service
      .movimientos(desde, hasta, this.filtrosMov(), pagina, TAMANO_PAGINA)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.movimientos.set(p.contenido);
          this.totalMov.set(p.totalElementos);
          this.paginaMov.set(p.pagina);
          this.totalPaginasMov.set(p.totalPaginas);
          this.cargandoMov.set(false);
        },
        error: (err: unknown) => {
          this.cargandoMov.set(false);
          this.errorMov.set(mensajeDeError(err, 'No se pudieron cargar los movimientos.'));
        },
      });
  }

  /** La URL refleja lo que se ve (una recarga deja el mismo punto); Hoy no deja parámetros. */
  private actualizarUrl(paginaMov: number): void {
    const periodo = this.periodo();
    const { desde, hasta } = this.fechas();
    const params: Params = {
      periodo: periodo === 'hoy' ? null : periodo,
      desde: periodo === 'rango' ? desde : null,
      hasta: periodo === 'rango' ? hasta : null,
      ...filtrosAUrl(this.filtrosMov(), FILTROS_MOVIMIENTOS_INICIALES),
      pagina: paginaMov > 0 ? paginaMov + 1 : null,
    };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
