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
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { BotonRecargar } from '../../../../shared/ui/boton-recargar/boton-recargar';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto';
import { Icono } from '../../../../shared/ui/icono/icono';
import { Vacio } from '../../../../shared/ui/vacio/vacio';
import { Empleado } from '../../../equipo/models/empleado.model';
import { EmpleadoService } from '../../../equipo/services/empleado.service';
import {
  CATEGORIAS_ACTIVIDAD,
  ETIQUETA_ACCION,
  EntradaActividad,
  FILTROS_ACTIVIDAD_INICIALES,
  FiltrosActividad,
} from '../../models/actividad.model';
import { ActividadService } from '../../services/actividad.service';

const TAMANO_PAGINA = 20;
const CLAVE_PANEL = 'actividad:filtros-abiertos';

/**
 * Registro de actividad de la sastrería (dueño 2026-10-22; solo SASTRE_ADMIN, desde Ajustes): quién
 * editó o anuló pedidos, cambió el equipo, exportó o importó información, o cambió los datos de la
 * sastrería, y cuándo, con lo que cambió. Se guarda 2 años. Búsqueda y filtros en la URL.
 */
@Component({
  selector: 'app-actividad',
  imports: [Encabezado, Esqueleto, Icono, Vacio, BotonRecargar, FechaHoraPipe],
  templateUrl: './actividad.html',
  styleUrl: './actividad.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Actividad implements OnInit {
  private readonly service = inject(ActividadService);
  private readonly equipo = inject(EmpleadoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly memoria = inject(Memoria);
  private readonly destroyRef = inject(DestroyRef);
  private readonly busqueda$ = new Subject<string>();

  readonly categorias = CATEGORIAS_ACTIVIDAD;
  readonly etiquetaAccion = ETIQUETA_ACCION;
  /** Personas para el filtro (todo el equipo, también los desactivados). */
  readonly personas = signal<Empleado[]>([]);

  readonly entradas = signal<EntradaActividad[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly errorFiltros = signal<string | null>(null);
  readonly filtros = signal<FiltrosActividad>(FILTROS_ACTIVIDAD_INICIALES);
  readonly filtrosAbiertos = signal(false);

  readonly cantidadFiltros = computed(() => {
    const f = this.filtros();
    return [f.categoria, f.persona, f.desde, f.hasta].filter(Boolean).length;
  });
  readonly hayFiltros = computed(() => this.cantidadFiltros() > 0 || this.filtros().buscar !== '');

  constructor() {
    recargaAutomatica(() => this.recargar());
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.filtros.set(filtrosDesdeUrl(params, FILTROS_ACTIVIDAD_INICIALES));
    this.filtrosAbiertos.set(this.memoria.leer<boolean>(CLAVE_PANEL) ?? this.cantidadFiltros() > 0);
    this.busqueda$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((texto) => {
        if (texto.trim() !== this.filtros().buscar) {
          this.cambiar({ buscar: texto.trim() });
        }
      });
    this.cargar(Math.max(Number(params.get('pagina')) || 1, 1) - 1);
    this.equipo
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (lista) => this.personas.set(lista), error: () => undefined });
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

  cambiar(cambio: Partial<FiltrosActividad>): void {
    this.aplicar({ ...this.filtros(), ...cambio });
  }

  limpiarFiltros(): void {
    this.aplicar(FILTROS_ACTIVIDAD_INICIALES);
  }

  irAPagina(pagina: number): void {
    if (pagina >= 0 && pagina < this.totalPaginas()) {
      this.cargar(pagina);
    }
  }

  private aplicar(filtros: FiltrosActividad): void {
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
        ...filtrosAUrl(filtros, FILTROS_ACTIVIDAD_INICIALES),
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
          this.entradas.set(p.contenido);
          this.total.set(p.totalElementos);
          this.pagina.set(p.pagina);
          this.totalPaginas.set(p.totalPaginas);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo cargar la actividad.'));
        },
      });
  }
}
