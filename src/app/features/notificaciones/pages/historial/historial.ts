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
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { filtrosAUrl, filtrosDesdeUrl } from '../../../../core/estado/filtros-url';
import { Memoria } from '../../../../core/estado/memoria';
import { recargaAutomatica } from '../../../../core/estado/recarga-automatica';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Bandeja, NotificacionBandeja } from '../../../../core/notificaciones/bandeja';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { BotonRecargar } from '../../../../shared/ui/boton-recargar/boton-recargar';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto';
import { Icono } from '../../../../shared/ui/icono/icono';
import { Vacio } from '../../../../shared/ui/vacio/vacio';
import {
  ETIQUETA_TIPO,
  FILTROS_HISTORIAL_INICIALES,
  FiltrosHistorial,
  TIPOS_NOTIFICACION,
} from '../../models/historial.model';
import { HistorialService } from '../../services/historial.service';

const TAMANO_PAGINA = 20;
const CLAVE_PANEL = 'historial-notificaciones:filtros-abiertos';

/**
 * Historial de notificaciones (dueño 2026-10-22): todo lo que llegó a la campana en los últimos
 * 90 días, también lo que se quitó de ella. Búsqueda y filtros en la URL; tocar un aviso lo marca
 * leído y lleva a donde corresponde. Se abre desde "Ver historial" en la campana.
 */
@Component({
  selector: 'app-historial-notificaciones',
  imports: [Encabezado, Esqueleto, Icono, Vacio, BotonRecargar, FechaHoraPipe],
  templateUrl: './historial.html',
  styleUrl: './historial.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialNotificaciones implements OnInit {
  private readonly service = inject(HistorialService);
  private readonly bandeja = inject(Bandeja);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly memoria = inject(Memoria);
  private readonly destroyRef = inject(DestroyRef);
  private readonly busqueda$ = new Subject<string>();

  readonly tipos = TIPOS_NOTIFICACION;
  readonly etiquetaTipo = ETIQUETA_TIPO;

  readonly avisos = signal<NotificacionBandeja[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly errorFiltros = signal<string | null>(null);
  readonly filtros = signal<FiltrosHistorial>(FILTROS_HISTORIAL_INICIALES);
  readonly filtrosAbiertos = signal(false);

  readonly cantidadFiltros = computed(() => {
    const f = this.filtros();
    return [f.tipo, f.estado, f.desde, f.hasta].filter(Boolean).length;
  });
  readonly hayFiltros = computed(() => this.cantidadFiltros() > 0 || this.filtros().buscar !== '');

  constructor() {
    recargaAutomatica(() => this.recargar());
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.filtros.set(filtrosDesdeUrl(params, FILTROS_HISTORIAL_INICIALES));
    this.filtrosAbiertos.set(this.memoria.leer<boolean>(CLAVE_PANEL) ?? this.cantidadFiltros() > 0);
    this.busqueda$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((texto) => {
        if (texto.trim() !== this.filtros().buscar) {
          this.cambiar({ buscar: texto.trim() });
        }
      });
    this.cargar(Math.max(Number(params.get('pagina')) || 1, 1) - 1);
  }

  recargar(): void {
    this.cargar(this.pagina());
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

  cambiar(cambio: Partial<FiltrosHistorial>): void {
    this.aplicar({ ...this.filtros(), ...cambio });
  }

  limpiarFiltros(): void {
    this.aplicar(FILTROS_HISTORIAL_INICIALES);
  }

  irAPagina(pagina: number): void {
    if (pagina >= 0 && pagina < this.totalPaginas()) {
      this.cargar(pagina);
    }
  }

  /** Tocar un aviso: queda leído y, si lleva a algún lado, va allí. */
  elegir(n: NotificacionBandeja): void {
    if (!n.leida) {
      this.bandeja.marcarLeida(n);
      this.avisos.update((l) => l.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
    }
    if (n.enlace) {
      this.router.navigateByUrl(n.enlace);
    }
  }

  private aplicar(filtros: FiltrosHistorial): void {
    this.filtros.set(filtros);
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      this.errorFiltros.set('"Desde" no puede ser posterior a "hasta".');
      return;
    }
    this.errorFiltros.set(null);
    this.cargar(0);
  }

  private cargar(pagina: number): void {
    this.cargando.set(true);
    this.error.set(null);
    const filtros = this.filtros();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...filtrosAUrl(filtros, FILTROS_HISTORIAL_INICIALES),
        pagina: pagina > 0 ? pagina + 1 : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.service
      .listar(filtros, pagina, TAMANO_PAGINA)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.avisos.set(p.contenido);
          this.total.set(p.totalElementos);
          this.pagina.set(p.pagina);
          this.totalPaginas.set(p.totalPaginas);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo cargar el historial.'));
        },
      });
  }
}
