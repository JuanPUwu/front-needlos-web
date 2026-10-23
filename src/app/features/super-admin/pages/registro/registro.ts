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
import { mensajeDeError } from '../../../../core/http/api-error';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import {
  ACCIONES_SUPERADMIN,
  AccionPlataforma,
  AccionSuperAdmin,
  ETIQUETA_ACCION_SUPERADMIN,
  FILTROS_REGISTRO_INICIALES,
  FiltrosRegistro,
} from '../../models/plataforma.model';
import { PlataformaService } from '../../services/plataforma.service';
import { recargaAutomatica } from '../../../../core/estado/recarga-automatica';
import { BotonRecargar } from '../../../../shared/ui/boton-recargar/boton-recargar';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto';
import { Vacio } from '../../../../shared/ui/vacio/vacio';

const TAMANO_PAGINA = 20;

/**
 * Registro de acciones de los SuperAdmins (Manual §16): quién hizo qué, sobre qué sastrería y
 * cuándo. Filtros en la URL (texto, tipo de acción y fechas) y paginado.
 */
@Component({
  selector: 'app-super-admin-registro',
  imports: [Esqueleto, Vacio, BotonRecargar, Encabezado, TituloBloque, FechaHoraPipe],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminRegistro implements OnInit {
  private readonly service = inject(PlataformaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly busqueda$ = new Subject<string>();

  readonly tipos = ACCIONES_SUPERADMIN;
  readonly etiquetaAccion = ETIQUETA_ACCION_SUPERADMIN;

  readonly acciones = signal<AccionPlataforma[] | null>(null);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly filtros = signal<FiltrosRegistro>(FILTROS_REGISTRO_INICIALES);

  readonly enEsqueleto = computed(() => this.acciones() === null);
  readonly hayFiltros = computed(() => {
    const f = this.filtros();
    return !!(f.buscar || f.accion || f.desde || f.hasta);
  });

  constructor() {
    recargaAutomatica(() => this.recargar());
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.filtros.set(filtrosDesdeUrl(params, FILTROS_REGISTRO_INICIALES));
    this.busqueda$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((texto) => {
        if (texto.trim() !== this.filtros().buscar) {
          this.cambiar({ buscar: texto.trim() });
        }
      });
    this.cargar(Math.max(Number(params.get('pagina')) || 1, 1) - 1);
  }

  /** Trae lo último sin perder lo que se ve. */
  recargar(): void {
    this.cargar(this.pagina());
  }

  alBuscar(texto: string): void {
    this.busqueda$.next(texto);
  }

  alCambiarTipo(valor: string): void {
    this.cambiar({ accion: valor as AccionSuperAdmin | '' });
  }

  alCambiarDesde(valor: string): void {
    this.cambiar({ desde: valor });
  }

  alCambiarHasta(valor: string): void {
    this.cambiar({ hasta: valor });
  }

  limpiarFiltros(): void {
    this.filtros.set(FILTROS_REGISTRO_INICIALES);
    this.cargar(0);
  }

  irAPagina(pagina: number): void {
    if (pagina >= 0 && pagina < this.totalPaginas()) {
      this.cargar(pagina);
    }
  }

  private cambiar(cambio: Partial<FiltrosRegistro>): void {
    this.filtros.update((f) => ({ ...f, ...cambio }));
    const f = this.filtros();
    if (f.desde && f.hasta && f.desde > f.hasta) {
      this.error.set('"Desde" no puede ser posterior a "hasta".');
      return;
    }
    this.cargar(0);
  }

  private cargar(pagina: number): void {
    this.cargando.set(true);
    this.error.set(null);
    const filtros = this.filtros();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...filtrosAUrl(filtros, FILTROS_REGISTRO_INICIALES),
        pagina: pagina > 0 ? pagina + 1 : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.service
      .acciones(pagina, TAMANO_PAGINA, undefined, filtros)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.acciones.set(p.contenido);
          this.total.set(p.totalElementos);
          this.pagina.set(p.pagina);
          this.totalPaginas.set(p.totalPaginas);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.acciones.set(this.acciones() ?? []);
          this.error.set(mensajeDeError(err, 'No se pudo cargar el registro.'));
        },
      });
  }
}
