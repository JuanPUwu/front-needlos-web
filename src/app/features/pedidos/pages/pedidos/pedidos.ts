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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { PermisosService } from '../../../../core/auth/permisos';
import { mensajeDeError } from '../../../../core/http/api-error';
import { FechaPipe } from '../../../../shared/pipes/fecha.pipe';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { hoyIso } from '../../../../shared/util/fechas';
import { MiembroAsignable } from '../../../equipo/models/empleado.model';
import { EmpleadoService } from '../../../equipo/services/empleado.service';
import { ClienteService } from '../../../clientes/services/cliente.service';
import {
  ETIQUETA_ESTADO,
  EstadoPedido,
  FILTROS_PEDIDOS_INICIALES,
  FiltrosPedidos,
  OrdenPedidos,
  PedidoResumen,
  ResumenPedidos,
} from '../../models/pedido.model';
import { PedidoService } from '../../services/pedido.service';

const TAMANO_PAGINA = 20;
/** Valor especial del filtro de sastre: "mis prendas" (mi accesoId). */
const MIS_PRENDAS = 'mias';

const ORDENES: { valor: OrdenPedidos; etiqueta: string }[] = [
  { valor: 'numero,desc', etiqueta: 'Más recientes' },
  { valor: 'numero,asc', etiqueta: 'Más antiguos' },
  { valor: 'fechaEntrega,asc', etiqueta: 'Entrega más próxima' },
  { valor: 'fechaEntrega,desc', etiqueta: 'Entrega más lejana' },
];

type Atajo = 'enProceso' | 'listos' | 'vencidos' | 'hoy';

/**
 * Pedidos: resumen (en proceso, listos, vencidos, para hoy; cada tile filtra), listado
 * con filtros y paginación, y acceso a "Nuevo pedido" si el usuario tiene permiso.
 * Acepta `?clienteId=&cliente=` para ver el historial de un cliente (desde Clientes).
 */
@Component({
  selector: 'app-pedidos',
  imports: [RouterLink, FechaPipe, MonedaPipe],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pedidos implements OnInit {
  private readonly service = inject(PedidoService);
  private readonly empleados = inject(EmpleadoService);
  private readonly clientes = inject(ClienteService);
  private readonly permisos = inject(PermisosService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly busqueda$ = new Subject<string>();

  readonly etiquetaEstado = ETIQUETA_ESTADO;
  readonly ordenes = ORDENES;
  readonly misPrendas = MIS_PRENDAS;
  readonly puedeCrear = computed(() => this.permisos.puede('CREAR_PEDIDOS'));
  readonly tengoAcceso = computed(() => this.permisos.accesoId() !== null);

  readonly pedidos = signal<PedidoResumen[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly resumen = signal<ResumenPedidos | null>(null);
  readonly sastres = signal<MiembroAsignable[]>([]);

  readonly filtros = signal<FiltrosPedidos>(FILTROS_PEDIDOS_INICIALES);
  /** Valor del select de sastre ('' todos, 'mias' o un accesoId). */
  readonly sastreElegido = signal('');
  /** Nombre del cliente filtrado (llega desde Clientes). */
  readonly clienteFiltrado = signal<string | null>(null);
  /** Lo que debe en total el cliente filtrado. */
  readonly saldoCliente = signal<number | null>(null);
  readonly errorFiltros = signal<string | null>(null);
  /** En pantallas angostas los filtros se pliegan detrás de un botón. */
  readonly filtrosAbiertos = signal(false);
  /** Filtros activos (para el botón "Filtros (n)"). */
  readonly cantidadFiltros = computed(() => {
    const f = this.filtros();
    return [
      f.estado,
      f.sastreId,
      f.entregaDesde,
      f.entregaHasta,
      f.vencidos,
      f.conSaldo,
      f.sinEntregar,
      f.clienteId,
    ].filter(Boolean).length;
  });
  readonly hayFiltros = computed(() => {
    const f = this.filtros();
    return (
      f.buscar !== '' ||
      f.estado !== '' ||
      f.clienteId !== '' ||
      f.sastreId !== '' ||
      f.entregaDesde !== '' ||
      f.entregaHasta !== '' ||
      f.vencidos ||
      f.conSaldo ||
      f.sinEntregar
    );
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const clienteId = params.get('clienteId');
    if (clienteId) {
      this.filtros.update((f) => ({ ...f, clienteId }));
      this.clienteFiltrado.set(params.get('cliente'));
      this.clientes
        .obtener(clienteId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (c) => this.saldoCliente.set(c.saldoPendiente),
          error: () => undefined,
        });
    }
    this.busqueda$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((texto) => {
        if (texto.trim() !== this.filtros().buscar) {
          this.cambiar({ buscar: texto.trim() });
        }
      });
    this.empleados
      .asignables()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (lista) => this.sastres.set(lista), error: () => undefined });
    this.cargarResumen();
    this.cargar(0);
  }

  alternarFiltros(): void {
    this.filtrosAbiertos.update((v) => !v);
  }

  alBuscar(texto: string): void {
    this.busqueda$.next(texto);
  }

  alCambiarEstado(valor: string): void {
    this.cambiar({ estado: valor as EstadoPedido | '' });
  }

  alCambiarSastre(valor: string): void {
    this.sastreElegido.set(valor);
    const sastreId = valor === MIS_PRENDAS ? (this.permisos.accesoId() ?? '') : valor;
    this.cambiar({ sastreId });
  }

  alCambiarOrden(valor: string): void {
    this.cambiar({ orden: valor as OrdenPedidos });
  }

  alCambiarDesde(fecha: string): void {
    this.cambiar({ entregaDesde: fecha });
  }

  alCambiarHasta(fecha: string): void {
    this.cambiar({ entregaHasta: fecha });
  }

  alCambiarVencidos(valor: boolean): void {
    this.cambiar({ vencidos: valor });
  }

  alCambiarConSaldo(valor: boolean): void {
    this.cambiar({ conSaldo: valor });
  }

  alCambiarSinEntregar(valor: boolean): void {
    this.cambiar({ sinEntregar: valor });
  }

  /** Los tiles del resumen aplican un filtro rápido (reemplaza los demás). */
  atajo(tipo: Atajo): void {
    const base = { ...FILTROS_PEDIDOS_INICIALES, orden: this.filtros().orden };
    this.sastreElegido.set('');
    this.quitarCliente(false);
    switch (tipo) {
      case 'enProceso':
        this.aplicar({ ...base, estado: 'EN_PROCESO' });
        break;
      case 'listos':
        this.aplicar({ ...base, estado: 'FINALIZADO' });
        break;
      case 'vencidos':
        this.aplicar({ ...base, vencidos: true });
        break;
      case 'hoy':
        // Igual que el contador: para hoy y con prendas sin entregar.
        this.aplicar({
          ...base,
          entregaDesde: hoyIso(),
          entregaHasta: hoyIso(),
          sinEntregar: true,
        });
        break;
    }
  }

  /** Quita los filtros pero conserva el orden elegido. */
  limpiarFiltros(): void {
    this.sastreElegido.set('');
    this.quitarCliente(false);
    this.aplicar({ ...FILTROS_PEDIDOS_INICIALES, orden: this.filtros().orden });
  }

  quitarCliente(recargar = true): void {
    this.clienteFiltrado.set(null);
    this.saldoCliente.set(null);
    if (this.route.snapshot.queryParamMap.has('clienteId')) {
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
    if (recargar) {
      this.cambiar({ clienteId: '' });
    } else {
      this.filtros.update((f) => ({ ...f, clienteId: '' }));
    }
  }

  irAPagina(pagina: number): void {
    if (pagina >= 0 && pagina < this.totalPaginas()) {
      this.cargar(pagina);
    }
  }

  private cambiar(cambio: Partial<FiltrosPedidos>): void {
    this.aplicar({ ...this.filtros(), ...cambio });
  }

  private aplicar(filtros: FiltrosPedidos): void {
    this.filtros.set(filtros);
    if (
      filtros.entregaDesde &&
      filtros.entregaHasta &&
      filtros.entregaDesde > filtros.entregaHasta
    ) {
      this.errorFiltros.set('"Desde" no puede ser posterior a "hasta".');
      return;
    }
    this.errorFiltros.set(null);
    this.cargar(0);
  }

  private cargarResumen(): void {
    this.service
      .resumen()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (r) => this.resumen.set(r), error: () => undefined });
  }

  private cargar(pagina: number): void {
    this.cargando.set(true);
    this.error.set(null);
    this.service
      .listar(this.filtros(), pagina, TAMANO_PAGINA)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.pedidos.set(p.contenido);
          this.total.set(p.totalElementos);
          this.pagina.set(p.pagina);
          this.totalPaginas.set(p.totalPaginas);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudieron cargar los pedidos.'));
        },
      });
  }
}
