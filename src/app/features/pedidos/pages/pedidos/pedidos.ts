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
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto';
import { Vacio } from '../../../../shared/ui/vacio/vacio';
import { Casilla } from '../../../../shared/ui/casilla/casilla';
import { PedidosTabla } from '../../components/pedidos-tabla/pedidos-tabla';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { PermisosService } from '../../../../core/auth/permisos';
import { filtrosAUrl, filtrosDesdeUrl } from '../../../../core/estado/filtros-url';
import { Memoria } from '../../../../core/estado/memoria';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { mensajeDeError } from '../../../../core/http/api-error';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { Icono } from '../../../../shared/ui/icono/icono';
import { hoyIso } from '../../../../shared/util/fechas';
import { MiembroAsignable } from '../../../equipo/models/empleado.model';
import { EmpleadoService } from '../../../equipo/services/empleado.service';
import { ClienteService } from '../../../clientes/services/cliente.service';
import {
  EstadoPedido,
  FILTROS_PEDIDOS_INICIALES,
  FiltrosPedidos,
  OrdenPedidos,
  Pedido,
  PedidoResumen,
  ResumenPedidos,
} from '../../models/pedido.model';
import { EstadoBarra } from '../../components/estado-barra/estado-barra';
import { PedidoModal } from '../../components/pedido-modal/pedido-modal';
import { PedidoService } from '../../services/pedido.service';
import { INTERVALO_LISTAS_MS, recargaAutomatica } from '../../../../core/estado/recarga-automatica';
import { BotonRecargar } from '../../../../shared/ui/boton-recargar/boton-recargar';

const TAMANO_PAGINA = 20;
/** Valor especial del filtro de sastre: "mis prendas" (mi accesoId). */
const MIS_PRENDAS = 'mias';

const CLAVE_PANEL = 'pedidos:filtros-abiertos';

/** Vista con la que arranca la sección; en la URL solo se escribe lo que difiere de ella. */
const VISTA_INICIAL: FiltrosPedidos = { ...FILTROS_PEDIDOS_INICIALES, estado: 'EN_PROCESO' };

const ORDENES: { valor: OrdenPedidos; etiqueta: string }[] = [
  { valor: 'numero,desc', etiqueta: 'Más recientes' },
  { valor: 'numero,asc', etiqueta: 'Más antiguos' },
  { valor: 'fechaEntrega,asc', etiqueta: 'Entrega más próxima' },
  { valor: 'fechaEntrega,desc', etiqueta: 'Entrega más lejana' },
];

/**
 * Pedidos: pestañas por estado (con su cantidad), tabla con búsqueda, panel de filtros plegable
 * (con "Vencidos (N)" y "Para hoy") y paginación; cada fila abre el
 * detalle. Arranca en "En proceso". Acepta `?clienteId=&cliente=` para ver el
 * historial de un cliente (desde Clientes; arranca en "Todo").
 */
@Component({
  selector: 'app-pedidos',
  imports: [
    BotonRecargar,
    Vacio,
    Esqueleto,
    Encabezado,
    MonedaPipe,
    Icono,
    EstadoBarra,
    PedidoModal,
    Casilla,
    PedidosTabla,
  ],
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
  private readonly memoria = inject(Memoria);
  private readonly notificaciones = inject(Notificaciones);
  private readonly destroyRef = inject(DestroyRef);
  private readonly busqueda$ = new Subject<string>();

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

  /**
   * Pestaña, búsqueda y filtros: viven en la URL (sobreviven a la recarga y se pueden
   * compartir). `sastreId` puede ser 'mias' ("Mis prendas"), que se resuelve al consultar.
   */
  readonly filtros = signal<FiltrosPedidos>(VISTA_INICIAL);
  /** Nombre del cliente filtrado (llega desde Clientes). */
  readonly clienteFiltrado = signal<string | null>(null);
  /** Lo que debe en total el cliente filtrado. */
  readonly saldoCliente = signal<number | null>(null);
  readonly errorFiltros = signal<string | null>(null);
  /** Pedido abierto en el popup (viene de `?pedido=` en la URL: "atrás" lo cierra). */
  readonly pedidoAbierto = signal<string | null>(null);
  /** El popup está en "Editar" (`?modo=editar`): una recarga vuelve a la edición. */
  readonly pedidoEditando = signal(false);
  /** Popup de "Nuevo pedido" abierto (`?nuevo=1`, sobrevive a la recarga). */
  readonly creando = signal(false);
  /** El panel de filtros se abre con el botón de la barra (preferencia recordada). */
  readonly filtrosAbiertos = signal(false);
  /** Filtros activos (sin contar la pestaña ni la búsqueda), para el botón de filtros. */
  readonly cantidadFiltros = computed(() => {
    const f = this.filtros();
    return [
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
      f.clienteId !== '' ||
      f.sastreId !== '' ||
      f.entregaDesde !== '' ||
      f.entregaHasta !== '' ||
      f.vencidos ||
      f.conSaldo ||
      f.sinEntregar
    );
  });

  constructor() {
    recargaAutomatica(() => this.recargar(), {
      cadaMs: INTERVALO_LISTAS_MS,
      puede: () => !this.pedidoAbierto() && !this.creando(),
    });
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const filtros = filtrosDesdeUrl(params, VISTA_INICIAL);
    if (filtros.clienteId) {
      // Historial de un cliente: todos sus pedidos, salvo que la URL diga otra pestaña.
      if (!params.has('estado')) {
        filtros.estado = '';
      }
      this.ponerCliente(filtros.clienteId, params.get('cliente'));
    }
    this.filtros.set(filtros);
    this.filtrosAbiertos.set(this.memoria.leer<boolean>(CLAVE_PANEL) ?? this.cantidadFiltros() > 0);
    const paginaUrl = Math.max(Number(params.get('pagina')) || 1, 1) - 1;
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      this.pedidoAbierto.set(q.get('pedido'));
      this.pedidoEditando.set(q.get('modo') === 'editar');
      this.creando.set(q.get('nuevo') === '1' && !q.get('pedido'));
    });
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
    this.cargar(paginaUrl);
  }

  alternarFiltros(): void {
    this.filtrosAbiertos.update((v) => !v);
    // Preferencia de pantalla: se recuerda 90 días.
    this.memoria.guardar(CLAVE_PANEL, this.filtrosAbiertos(), 24 * 90);
  }

  /** El popup pasó a "Editar" o volvió al detalle: se anota en la URL. */
  alCambiarModo(editando: boolean): void {
    this.navegar({ modo: editando ? 'editar' : null });
  }

  alBuscar(texto: string): void {
    this.busqueda$.next(texto);
  }

  /** Botón "Buscar" o Enter: busca ya, sin esperar a que se deje de escribir. */
  buscarAhora(texto: string): void {
    const limpio = texto.trim();
    if (limpio !== this.filtros().buscar) {
      this.cambiar({ buscar: limpio });
    } else {
      this.cargar(0);
    }
  }

  nuevoPedido(): void {
    this.navegar({ nuevo: '1', pedido: null, modo: null }, false);
  }

  /** Pedido creado: el popup se cierra solo (dueño 2026-10-20) y la lista se actualiza. */
  alCrear(pedido: Pedido): void {
    this.notificaciones.exito(`Pedido ${pedido.numero} creado.`);
    this.cargarResumen();
    // Una sola navegación: recargar la lista y cerrar el formulario (dos seguidas se pisarían).
    this.cargar(this.pagina(), { nuevo: null, pedido: null, modo: null });
  }

  elegirEstado(valor: EstadoPedido | ''): void {
    if (valor !== this.filtros().estado) {
      this.cambiar({ estado: valor });
    }
  }

  recargar(): void {
    this.cargarResumen();
    this.cargar(this.pagina());
  }

  abrir(pedido: PedidoResumen): void {
    // Sin reemplazar: el botón "atrás" del navegador cierra el popup.
    this.navegar({ pedido: pedido.id, modo: null }, false);
  }

  cerrarPedido(): void {
    this.navegar({ pedido: null, modo: null, nuevo: null });
  }

  /** Desde el popup: cierra y muestra todos los pedidos de ese cliente. */
  verCliente(cliente: { id: string; nombre: string }): void {
    this.ponerCliente(cliente.id, cliente.nombre);
    this.aplicar(
      { ...FILTROS_PEDIDOS_INICIALES, orden: this.filtros().orden, clienteId: cliente.id },
      { pedido: null, modo: null },
    );
  }

  private ponerCliente(id: string, nombre: string | null): void {
    this.clienteFiltrado.set(nombre);
    this.saldoCliente.set(null);
    this.clientes
      .obtener(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => this.saldoCliente.set(c.saldoPendiente),
        error: () => undefined,
      });
  }

  alCambiarSastre(valor: string): void {
    this.cambiar({ sastreId: valor });
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

  /** "Para hoy": pedidos que se entregan hoy (fecha de entrega desde y hasta hoy). */
  readonly esParaHoy = computed(
    () => this.filtros().entregaDesde === hoyIso() && this.filtros().entregaHasta === hoyIso(),
  );

  alCambiarParaHoy(valor: boolean): void {
    this.cambiar({ entregaDesde: valor ? hoyIso() : '', entregaHasta: valor ? hoyIso() : '' });
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

  /** Quita los filtros pero conserva la pestaña y el orden elegidos. */
  limpiarFiltros(): void {
    this.quitarCliente(false);
    const { estado, orden } = this.filtros();
    this.aplicar({ ...FILTROS_PEDIDOS_INICIALES, estado, orden });
  }

  quitarCliente(recargar = true): void {
    this.clienteFiltrado.set(null);
    this.saldoCliente.set(null);
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

  /** `extra`: otros parámetros de URL a cambiar en la misma navegación (p. ej. cerrar el popup). */
  private aplicar(filtros: FiltrosPedidos, extra: Params = {}): void {
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
    this.cargar(0, extra);
  }

  private cargarResumen(): void {
    this.service
      .resumen()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (r) => this.resumen.set(r), error: () => undefined });
  }

  /** Cambia parámetros de la URL sin tocar los demás (por defecto, sin crear historial). */
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
    // La URL refleja lo que se ve: una recarga deja al usuario en el mismo punto.
    this.navegar({
      ...filtrosAUrl(filtros, VISTA_INICIAL),
      cliente: filtros.clienteId ? this.clienteFiltrado() : null,
      pagina: pagina > 0 ? pagina + 1 : null,
      ...extra,
    });
    const consulta =
      filtros.sastreId === MIS_PRENDAS
        ? { ...filtros, sastreId: this.permisos.accesoId() ?? '' }
        : filtros;
    this.service
      .listar(consulta, pagina, TAMANO_PAGINA)
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
