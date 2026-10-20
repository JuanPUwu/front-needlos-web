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
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import { DUENOS_ESQUELETO, DuenosTabla } from '../../components/duenos-tabla/duenos-tabla';
import {
  Dueno,
  ESTADOS_CORREO_DUENO,
  EstadoCorreoDueno,
  FILTROS_DUENOS_INICIALES,
  FiltrosDuenos,
  ORDENES_DUENOS,
  OrdenDuenos,
} from '../../models/plataforma.model';
import { PlataformaService } from '../../services/plataforma.service';
import { recargaAutomatica } from '../../../../core/estado/recarga-automatica';
import { BotonRecargar } from '../../../../shared/ui/boton-recargar/boton-recargar';
import { Vacio } from '../../../../shared/ui/vacio/vacio';

const TAMANO_PAGINA = 20;

/**
 * Dueños de sastrerías (Manual §16): las cuentas con acceso de admin, con sus sastrerías y cómo
 * contactarlas. Filtros en la URL (texto, estado del correo, orden) y paginado.
 */
@Component({
  selector: 'app-super-admin-duenos',
  imports: [Vacio, BotonRecargar, Encabezado, TituloBloque, DuenosTabla],
  templateUrl: './duenos.html',
  styleUrl: './duenos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminDuenos implements OnInit {
  private readonly service = inject(PlataformaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly busqueda$ = new Subject<string>();

  readonly correos = ESTADOS_CORREO_DUENO;
  readonly ordenes = ORDENES_DUENOS;
  readonly esqueletoFilas = DUENOS_ESQUELETO;

  readonly duenos = signal<Dueno[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly filtros = signal<FiltrosDuenos>(FILTROS_DUENOS_INICIALES);

  readonly hayFiltros = computed(() => !!this.filtros().buscar || !!this.filtros().correo);
  readonly enEsqueleto = computed(() => this.cargando() && this.duenos().length === 0);

  constructor() {
    recargaAutomatica(() => this.recargar());
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.filtros.set(filtrosDesdeUrl(params, FILTROS_DUENOS_INICIALES));
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

  alCambiarCorreo(valor: string): void {
    this.cambiar({ correo: valor as EstadoCorreoDueno | '' });
  }

  alCambiarOrden(valor: string): void {
    this.cambiar({ orden: valor as OrdenDuenos });
  }

  limpiarFiltros(): void {
    this.filtros.set({ ...FILTROS_DUENOS_INICIALES, orden: this.filtros().orden });
    this.cargar(0);
  }

  irAPagina(pagina: number): void {
    if (pagina >= 0 && pagina < this.totalPaginas()) {
      this.cargar(pagina);
    }
  }

  private cambiar(cambio: Partial<FiltrosDuenos>): void {
    this.filtros.update((f) => ({ ...f, ...cambio }));
    this.cargar(0);
  }

  private cargar(pagina: number): void {
    this.cargando.set(true);
    this.error.set(null);
    const filtros = this.filtros();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...filtrosAUrl(filtros, FILTROS_DUENOS_INICIALES),
        pagina: pagina > 0 ? pagina + 1 : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.service
      .duenos(filtros, pagina, TAMANO_PAGINA)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.duenos.set(p.contenido);
          this.total.set(p.totalElementos);
          this.pagina.set(p.pagina);
          this.totalPaginas.set(p.totalPaginas);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudieron cargar los dueños.'));
        },
      });
  }
}
