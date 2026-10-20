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
import { PermisosService } from '../../../../core/auth/permisos';
import { filtrosAUrl, filtrosDesdeUrl } from '../../../../core/estado/filtros-url';
import { Memoria } from '../../../../core/estado/memoria';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto';
import { Icono } from '../../../../shared/ui/icono/icono';
import { CambioMaterial, MaterialModal } from '../../components/material-modal/material-modal';
import { MaterialesTabla } from '../../components/materiales-tabla/materiales-tabla';
import {
  ESTADOS_MATERIAL,
  EstadoMaterial,
  FILTROS_MATERIALES_INICIALES,
  FiltrosMateriales,
  Material,
  ORDENES_MATERIALES,
  OrdenMateriales,
} from '../../models/material.model';
import { MaterialService } from '../../services/material.service';

const TAMANO_PAGINA = 20;
const CLAVE_PANEL = 'inventario:filtros-abiertos';

/**
 * Inventario (Manual §14): todo el equipo lo consulta; con el permiso GESTIONAR_INVENTARIO se
 * crean materiales y se registran entradas y salidas. Listado con búsqueda y filtros en la URL
 * (Stock bajo es un filtro, con su cantidad) y popup del material (`?nuevo=1`, `?material=<id>`).
 */
@Component({
  selector: 'app-inventario',
  imports: [Encabezado, Esqueleto, Icono, MaterialesTabla, MaterialModal],
  templateUrl: './inventario.html',
  styleUrl: './inventario.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Inventario implements OnInit {
  private readonly service = inject(MaterialService);
  private readonly permisos = inject(PermisosService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly memoria = inject(Memoria);
  private readonly notificaciones = inject(Notificaciones);
  private readonly destroyRef = inject(DestroyRef);
  private readonly busqueda$ = new Subject<string>();

  readonly estados = ESTADOS_MATERIAL;
  readonly ordenes = ORDENES_MATERIALES;

  readonly materiales = signal<Material[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly filtros = signal<FiltrosMateriales>(FILTROS_MATERIALES_INICIALES);
  readonly filtrosAbiertos = signal(false);
  /** Materiales activos con stock bajo (se muestra en la opción del filtro Stock). */
  readonly conStockBajo = signal(0);
  /** Popup: nuevo (`?nuevo=1`) o un material (`?material=<id>`). */
  readonly creando = signal(false);
  readonly materialAbierto = signal<string | null>(null);

  readonly puedeGestionar = computed(() => this.permisos.puede('GESTIONAR_INVENTARIO'));
  /** Una sola clave por popup: al pasar de "nuevo" al material creado, el popup se rehace. */
  readonly popup = computed(() =>
    this.materialAbierto() ? [this.materialAbierto()!] : this.creando() ? ['nuevo'] : [],
  );
  readonly cantidadFiltros = computed(() => {
    const f = this.filtros();
    return [f.estado !== 'ACTIVOS', f.stockBajo].filter(Boolean).length;
  });
  readonly hayFiltros = computed(() => this.cantidadFiltros() > 0 || this.filtros().buscar !== '');

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.filtros.set(filtrosDesdeUrl(params, FILTROS_MATERIALES_INICIALES));
    this.filtrosAbiertos.set(this.memoria.leer<boolean>(CLAVE_PANEL) ?? this.cantidadFiltros() > 0);
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      this.materialAbierto.set(q.get('material'));
      this.creando.set(q.get('nuevo') === '1' && !q.get('material'));
    });
    this.busqueda$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((texto) => {
        if (texto.trim() !== this.filtros().buscar) {
          this.cambiar({ buscar: texto.trim() });
        }
      });
    this.cargar(Math.max(Number(params.get('pagina')) || 1, 1) - 1);
    this.contarStockBajo();
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

  alCambiarEstado(valor: string): void {
    this.cambiar({ estado: valor as EstadoMaterial });
  }

  alCambiarStock(valor: string): void {
    this.cambiar({ stockBajo: valor === 'bajo' });
  }

  alCambiarOrden(valor: string): void {
    this.cambiar({ orden: valor as OrdenMateriales });
  }

  limpiarFiltros(): void {
    this.filtros.set({ ...FILTROS_MATERIALES_INICIALES, orden: this.filtros().orden });
    this.cargar(0);
  }

  irAPagina(pagina: number): void {
    if (pagina >= 0 && pagina < this.totalPaginas()) {
      this.cargar(pagina);
    }
  }

  nuevoMaterial(): void {
    this.navegar({ nuevo: '1', material: null }, false);
  }

  abrir(material: Material): void {
    this.navegar({ material: material.id, nuevo: null }, false);
  }

  cerrarPopup(): void {
    this.navegar({ material: null, nuevo: null });
  }

  /** Algo cambió en el popup: avisa, refresca el listado y, si se creó, abre el material. */
  alCambiar(cambio: CambioMaterial): void {
    this.notificaciones.exito(cambio.mensaje);
    this.contarStockBajo();
    this.cargar(this.pagina(), cambio.nuevo ? { material: cambio.material.id, nuevo: null } : {});
  }

  private cambiar(cambio: Partial<FiltrosMateriales>): void {
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

  private contarStockBajo(): void {
    this.service
      .contarStockBajo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (p) => this.conStockBajo.set(p.totalElementos), error: () => undefined });
  }

  private cargar(pagina: number, extra: Params = {}): void {
    this.cargando.set(true);
    this.error.set(null);
    const filtros = this.filtros();
    this.navegar({
      ...filtrosAUrl(filtros, FILTROS_MATERIALES_INICIALES),
      pagina: pagina > 0 ? pagina + 1 : null,
      ...extra,
    });
    this.service
      .listar(filtros, pagina, TAMANO_PAGINA)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.materiales.set(p.contenido);
          this.total.set(p.totalElementos);
          this.pagina.set(p.pagina);
          this.totalPaginas.set(p.totalPaginas);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo cargar el inventario.'));
        },
      });
  }
}
