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
import { mensajeDeError } from '../../../../core/http/api-error';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import { CambioSastreria, SastreriaModal } from '../../components/sastreria-modal/sastreria-modal';
import { SastreriasTabla } from '../../components/sastrerias-tabla/sastrerias-tabla';
import {
  ESTADOS_PLATAFORMA,
  EstadoPlataforma,
  FILTROS_SASTRERIAS_INICIALES,
  FiltrosSastrerias,
  ORDENES_SASTRERIAS,
  OrdenSastrerias,
  ResumenPlataforma,
  SastreriaPlataforma,
} from '../../models/plataforma.model';
import { PlataformaService } from '../../services/plataforma.service';
import { recargaAutomatica } from '../../../../core/estado/recarga-automatica';
import { BotonRecargar } from '../../../../shared/ui/boton-recargar/boton-recargar';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto';
import { Vacio } from '../../../../shared/ui/vacio/vacio';

const TAMANO_PAGINA = 20;

/**
 * Sastrerías del SuperAdmin (Manual §16): cifras de todas, listado con su uso (sin montos), filtros
 * en la URL y el popup de cada una (`?sastreria=<id>`: licencia por meses, bloquear por abuso, recuperar,
 * modo soporte). Mientras carga, cifras y tabla se pintan con su mismo marcado en gris.
 */
@Component({
  selector: 'app-super-admin-sastrerias',
  imports: [
    Esqueleto,
    Vacio,
    BotonRecargar,
    Encabezado,
    TituloBloque,
    SastreriasTabla,
    SastreriaModal,
  ],
  templateUrl: './sastrerias.html',
  styleUrl: './sastrerias.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminSastrerias implements OnInit {
  private readonly service = inject(PlataformaService);
  private readonly notificaciones = inject(Notificaciones);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly busqueda$ = new Subject<string>();

  readonly estados = ESTADOS_PLATAFORMA;
  readonly ordenes = ORDENES_SASTRERIAS;

  readonly resumen = signal<ResumenPlataforma | null>(null);
  readonly sastrerias = signal<SastreriaPlataforma[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly filtros = signal<FiltrosSastrerias>(FILTROS_SASTRERIAS_INICIALES);
  readonly abierta = signal<string | null>(null);

  /** Una clave por popup (se rehace al abrir otra sastrería). */
  readonly popup = computed(() => (this.abierta() ? [this.abierta()!] : []));
  readonly hayFiltros = computed(() => !!this.filtros().buscar || !!this.filtros().estado);
  /** Primera carga: la tabla se pinta con filas de ejemplo en gris. */
  readonly enEsqueleto = computed(() => this.cargando() && this.sastrerias().length === 0);

  /** Cifras, en el orden en que se muestran. */
  readonly cifras = computed(() => {
    const r = this.resumen();
    return [
      { etiqueta: 'Sastrerías', valor: r?.total, tono: 'navy' },
      { etiqueta: 'Activas', valor: r?.activas, tono: 'navy' },
      { etiqueta: 'En prueba', valor: r?.enPrueba, tono: 'PRUEBA' },
      { etiqueta: 'Licenciadas', valor: r?.licenciadas, tono: 'LICENCIADA' },
      { etiqueta: 'Por vencer', valor: r?.porVencer, tono: 'POR_VENCER' },
      { etiqueta: 'Sin plan', valor: r?.sinPlan, tono: 'SIN_PLAN' },
      { etiqueta: 'Bloqueadas', valor: r?.bloqueadas, tono: 'BLOQUEADA' },
      { etiqueta: 'En eliminación', valor: r?.enEliminacion, tono: 'EN_ELIMINACION' },
    ];
  });

  constructor() {
    recargaAutomatica(() => this.recargar(), { puede: () => !this.abierta() });
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.filtros.set(filtrosDesdeUrl(params, FILTROS_SASTRERIAS_INICIALES));
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => this.abierta.set(q.get('sastreria')));
    this.busqueda$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((texto) => {
        if (texto.trim() !== this.filtros().buscar) {
          this.cambiar({ buscar: texto.trim() });
        }
      });
    this.cargarResumen();
    this.cargar(Math.max(Number(params.get('pagina')) || 1, 1) - 1);
  }

  /** Trae lo último (cifras y la misma página) sin perder lo que se ve. */
  recargar(): void {
    this.cargarResumen();
    this.cargar(this.pagina());
  }

  alBuscar(texto: string): void {
    this.busqueda$.next(texto);
  }

  alCambiarEstado(valor: string): void {
    this.cambiar({ estado: valor as EstadoPlataforma | '' });
  }

  alCambiarOrden(valor: string): void {
    this.cambiar({ orden: valor as OrdenSastrerias });
  }

  limpiarFiltros(): void {
    this.filtros.set({ ...FILTROS_SASTRERIAS_INICIALES, orden: this.filtros().orden });
    this.cargar(0);
  }

  irAPagina(pagina: number): void {
    if (pagina >= 0 && pagina < this.totalPaginas()) {
      this.cargar(pagina);
    }
  }

  abrir(s: SastreriaPlataforma): void {
    this.navegar({ sastreria: s.id }, false);
  }

  cerrarPopup(): void {
    this.navegar({ sastreria: null });
  }

  /** Algo cambió en el popup: avisa y refresca cifras y listado. */
  alCambiar(cambio: CambioSastreria): void {
    this.notificaciones.exito(cambio.mensaje);
    this.cargarResumen();
    this.cargar(this.pagina());
  }

  private cambiar(cambio: Partial<FiltrosSastrerias>): void {
    this.filtros.update((f) => ({ ...f, ...cambio }));
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

  private cargarResumen(): void {
    this.service
      .resumen()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (r) => this.resumen.set(r), error: () => undefined });
  }

  private cargar(pagina: number): void {
    this.cargando.set(true);
    this.error.set(null);
    const filtros = this.filtros();
    this.navegar({
      ...filtrosAUrl(filtros, FILTROS_SASTRERIAS_INICIALES),
      pagina: pagina > 0 ? pagina + 1 : null,
    });
    this.service
      .sastrerias(filtros, pagina, TAMANO_PAGINA)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.sastrerias.set(p.contenido);
          this.total.set(p.totalElementos);
          this.pagina.set(p.pagina);
          this.totalPaginas.set(p.totalPaginas);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudieron cargar las sastrerías.'));
        },
      });
  }
}
