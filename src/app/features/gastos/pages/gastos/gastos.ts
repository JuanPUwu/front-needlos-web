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
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { filtrosAUrl, filtrosDesdeUrl } from '../../../../core/estado/filtros-url';
import { Memoria } from '../../../../core/estado/memoria';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto';
import { Icono } from '../../../../shared/ui/icono/icono';
import { METODOS_PAGO } from '../../../pedidos/models/pedido.model';
import { GastoModal } from '../../components/gasto-modal/gasto-modal';
import { GastosTabla } from '../../components/gastos-tabla/gastos-tabla';
import {
  FILTROS_GASTOS_INICIALES,
  FiltrosGastos,
  Gasto,
  ORDENES_GASTOS,
  OrdenGastos,
} from '../../models/gasto.model';
import { GastoService } from '../../services/gasto.service';

const TAMANO_PAGINA = 20;
const CLAVE_PANEL = 'gastos:filtros-abiertos';

/**
 * Gastos (egresos, Manual §12.2; solo SASTRE_ADMIN): listado con búsqueda y filtros en la URL,
 * popup para registrar (`?nuevo=1`) y corregir (`?gasto=<id>`, con su historial de cambios) y
 * eliminación con confirmación.
 */
@Component({
  selector: 'app-gastos',
  imports: [Encabezado, Esqueleto, Icono, MonedaPipe, GastosTabla, GastoModal],
  templateUrl: './gastos.html',
  styleUrl: './gastos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gastos implements OnInit {
  private readonly service = inject(GastoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly memoria = inject(Memoria);
  private readonly confirmacion = inject(Confirmacion);
  private readonly notificaciones = inject(Notificaciones);
  private readonly destroyRef = inject(DestroyRef);
  private readonly busqueda$ = new Subject<string>();

  readonly metodos = METODOS_PAGO;
  readonly ordenes = ORDENES_GASTOS;

  readonly gastos = signal<Gasto[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly errorFiltros = signal<string | null>(null);
  readonly filtros = signal<FiltrosGastos>(FILTROS_GASTOS_INICIALES);
  readonly filtrosAbiertos = signal(false);
  /** Popup: nuevo (`?nuevo=1`) o corrección (`?gasto=<id>`). */
  readonly creando = signal(false);
  readonly gastoAbierto = signal<string | null>(null);

  /** Suma de lo que se ve en esta página. */
  readonly sumaPagina = computed(() => this.gastos().reduce((s, g) => s + g.monto, 0));
  readonly cantidadFiltros = computed(() => {
    const f = this.filtros();
    return [f.metodo, f.desde, f.hasta].filter(Boolean).length;
  });
  readonly hayFiltros = computed(() => this.cantidadFiltros() > 0 || this.filtros().buscar !== '');

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.filtros.set(filtrosDesdeUrl(params, FILTROS_GASTOS_INICIALES));
    this.filtrosAbiertos.set(this.memoria.leer<boolean>(CLAVE_PANEL) ?? this.cantidadFiltros() > 0);
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      this.gastoAbierto.set(q.get('gasto'));
      this.creando.set(q.get('nuevo') === '1' && !q.get('gasto'));
    });
    this.busqueda$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((texto) => {
        if (texto.trim() !== this.filtros().buscar) {
          this.cambiar({ buscar: texto.trim() });
        }
      });
    this.cargar(Math.max(Number(params.get('pagina')) || 1, 1) - 1);
  }

  alBuscar(texto: string): void {
    this.busqueda$.next(texto);
  }

  buscarAhora(texto: string): void {
    const limpio = texto.trim();
    if (limpio !== this.filtros().buscar) {
      this.cambiar({ buscar: limpio });
    } else {
      this.cargar(0);
    }
  }

  alternarFiltros(): void {
    this.filtrosAbiertos.update((v) => !v);
    this.memoria.guardar(CLAVE_PANEL, this.filtrosAbiertos(), 24 * 90);
  }

  alCambiarMetodo(valor: string): void {
    this.cambiar({ metodo: valor });
  }

  alCambiarDesde(valor: string): void {
    this.cambiar({ desde: valor });
  }

  alCambiarHasta(valor: string): void {
    this.cambiar({ hasta: valor });
  }

  alCambiarOrden(valor: string): void {
    this.cambiar({ orden: valor as OrdenGastos });
  }

  limpiarFiltros(): void {
    this.aplicar({ ...FILTROS_GASTOS_INICIALES, orden: this.filtros().orden });
  }

  irAPagina(pagina: number): void {
    if (pagina >= 0 && pagina < this.totalPaginas()) {
      this.cargar(pagina);
    }
  }

  nuevoGasto(): void {
    this.navegar({ nuevo: '1', gasto: null }, false);
  }

  abrir(gasto: Gasto): void {
    this.navegar({ gasto: gasto.id, nuevo: null }, false);
  }

  cerrarPopup(): void {
    this.navegar({ gasto: null, nuevo: null });
  }

  alGuardar(evento: { gasto: Gasto; nuevo: boolean }): void {
    this.notificaciones.exito(evento.nuevo ? 'Gasto registrado.' : 'Gasto corregido.');
    this.cargar(evento.nuevo ? 0 : this.pagina(), { gasto: null, nuevo: null });
  }

  async eliminar(gasto: Gasto): Promise<void> {
    const ok = await this.confirmacion.pedir({
      titulo: '¿Eliminar este gasto?',
      mensaje: `"${gasto.razon}" dejará de contar en el resumen. Quedará en el historial de cambios.`,
      aceptar: 'Sí, eliminar',
      peligro: true,
    });
    if (!ok) {
      return;
    }
    this.service
      .eliminar(gasto.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificaciones.exito('Gasto eliminado.');
          const pagina = this.gastos().length === 1 ? this.pagina() - 1 : this.pagina();
          this.cargar(Math.max(pagina, 0));
        },
        error: (err: unknown) =>
          this.notificaciones.error(mensajeDeError(err, 'No se pudo eliminar el gasto.')),
      });
  }

  private cambiar(cambio: Partial<FiltrosGastos>): void {
    this.aplicar({ ...this.filtros(), ...cambio });
  }

  private aplicar(filtros: FiltrosGastos): void {
    this.filtros.set(filtros);
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      this.errorFiltros.set('"Desde" no puede ser posterior a "hasta".');
      return;
    }
    this.errorFiltros.set(null);
    this.cargar(0);
  }

  private navegar(params: Params, reemplazar = true): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: reemplazar,
    });
  }

  private cargar(pagina: number, extra: Params = {}): void {
    this.cargando.set(true);
    this.error.set(null);
    const filtros = this.filtros();
    this.navegar({
      ...filtrosAUrl(filtros, FILTROS_GASTOS_INICIALES),
      pagina: pagina > 0 ? pagina + 1 : null,
      ...extra,
    });
    this.service
      .listar(filtros, pagina, TAMANO_PAGINA)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.gastos.set(p.contenido);
          this.total.set(p.totalElementos);
          this.pagina.set(p.pagina);
          this.totalPaginas.set(p.totalPaginas);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudieron cargar los gastos.'));
        },
      });
  }
}
