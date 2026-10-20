import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Memoria } from '../../../../core/estado/memoria';
import {
  FormularioRecordado,
  recordarFormulario,
} from '../../../../core/estado/recordar-formulario';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { CantidadPipe } from '../../../../shared/pipes/cantidad.pipe';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { Icono } from '../../../../shared/ui/icono/icono';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import { nuevaClave } from '../../../../shared/util/fechas';
import { PATRON_MONTO, aNumero, aTexto } from '../../../../shared/util/montos';
import {
  Material,
  MovimientoMaterial,
  TipoMovimientoMaterial,
  UNIDADES,
  UnidadMedida,
  etiquetaUnidad,
} from '../../models/material.model';
import { MaterialService } from '../../services/material.service';
import { Vacio } from '../../../../shared/ui/vacio/vacio';
import { avisoFaltantes } from '../../../../shared/util/faltantes';

const CON_TEXTO = /\S/;
const TAMANO_HISTORIAL = 10;

/** Qué cambió, para que el listado se actualice y avise. */
export interface CambioMaterial {
  material: Material;
  mensaje: string;
  nuevo: boolean;
}

/**
 * Popup del material (Reglas §12.3, formulario base). Sin id: "Nuevo material" (con cantidad
 * inicial opcional). Con id: registrar entradas y salidas, editar sus datos, desactivar o
 * reactivar, y su historial al lado. Sin el permiso GESTIONAR_INVENTARIO todo es de solo lectura.
 * Recuerda los borradores, protege los movimientos contra el doble clic (Idempotency-Key) y pide
 * confirmar antes de perder lo escrito.
 */
@Component({
  selector: 'app-material-modal',
  imports: [
    Vacio,
    ReactiveFormsModule,
    Encabezado,
    Icono,
    TituloBloque,
    CantidadPipe,
    FechaHoraPipe,
  ],
  templateUrl: './material-modal.html',
  styleUrl: './material-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cerrar()' },
})
export class MaterialModal implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(MaterialService);
  private readonly memoria = inject(Memoria);
  private readonly confirmacion = inject(Confirmacion);
  private readonly destroyRef = inject(DestroyRef);

  /** null = material nuevo. */
  readonly materialId = input<string | null>(null);
  readonly puedeGestionar = input(false);
  readonly cambiado = output<CambioMaterial>();
  readonly cerrado = output<void>();

  readonly unidades = UNIDADES;
  readonly etiquetaUnidad = etiquetaUnidad;

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly material = signal<Material | null>(null);

  readonly historial = signal<MovimientoMaterial[]>([]);
  readonly paginaHistorial = signal(0);
  readonly totalPaginasHistorial = signal(0);
  readonly cargandoHistorial = signal(false);

  readonly datos = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(CON_TEXTO)]],
    unidad: ['METRO' as UnidadMedida, [Validators.required]],
    stockMinimo: ['0', [Validators.required, Validators.pattern(PATRON_MONTO)]],
    cantidadInicial: ['', [Validators.pattern(PATRON_MONTO)]],
  });

  readonly movimiento = this.fb.nonNullable.group({
    tipo: ['ENTRADA' as TipoMovimientoMaterial, [Validators.required]],
    cantidad: ['', [Validators.required, Validators.pattern(PATRON_MONTO)]],
    razon: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(CON_TEXTO)]],
  });

  /** Valores de "Datos del material" tal como están guardados (para saber si hay cambios). */
  private datosGuardados = JSON.stringify(this.datos.getRawValue());
  private clave = nuevaClave();
  private borradorDatos!: FormularioRecordado<{ version?: number }>;
  private borradorMovimiento?: FormularioRecordado<{ clave?: string }>;
  private readonly caja = viewChild.required<ElementRef<HTMLElement>>('caja');
  private readonly focoPrevio = document.activeElement as HTMLElement | null;

  constructor() {
    afterNextRender(() => this.caja().nativeElement.focus());
    // Los permisos pueden llegar después de abrir el popup (recarga con ?material=…).
    effect(() => {
      const accion = this.puedeGestionar() ? 'enable' : 'disable';
      this.datos[accion]({ emitEvent: false });
      this.movimiento[accion]({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    const id = this.materialId();
    this.borradorDatos = recordarFormulario(
      this.datos,
      this.memoria,
      id ? `material-editar:${id}` : 'material-nuevo',
      this.destroyRef,
      { extra: () => ({ version: this.material()?.version }) },
    );
    if (id) {
      this.borradorMovimiento = recordarFormulario(
        this.movimiento,
        this.memoria,
        `material-movimiento:${id}`,
        this.destroyRef,
        { extra: () => ({ clave: this.clave }) },
      );
      const mov = this.borradorMovimiento.leer();
      if (mov) {
        this.movimiento.patchValue(mov.valores);
        this.movimiento.markAsDirty();
        this.clave = mov.clave ?? this.clave;
      }
      this.cargar(id);
      return;
    }
    const guardado = this.borradorDatos.leer();
    if (guardado) {
      this.datos.patchValue(guardado.valores);
      this.datos.markAsDirty();
    }
  }

  ngOnDestroy(): void {
    this.focoPrevio?.focus?.();
  }

  // ── Movimientos ───────────────────────────────────────────

  /** Elegir entrada o salida no cuenta como "escribir algo". */
  elegirTipo(tipo: TipoMovimientoMaterial): void {
    this.movimiento.controls.tipo.setValue(tipo);
  }

  /**
   * Hay algo escrito sin guardar: los datos difieren de lo guardado o el movimiento tiene una
   * cantidad o una razón. Solo entonces se pide confirmar al cerrar (abrir y cerrar sin tocar
   * nada no pregunta).
   */
  hayCambios(): boolean {
    const mov = this.movimiento.getRawValue();
    return this.datosCambiados() || mov.cantidad.trim() !== '' || mov.razon.trim() !== '';
  }

  /** Error en línea de la cantidad del movimiento. */
  errorCantidad(): string | null {
    const control = this.movimiento.controls.cantidad;
    if (!control.touched) {
      return null;
    }
    const n = aNumero(control.value);
    if (control.invalid || n === null) {
      return 'Solo números, hasta 2 decimales';
    }
    if (n <= 0) {
      return 'Mayor que 0';
    }
    const m = this.material();
    if (m && this.movimiento.controls.tipo.value === 'SALIDA' && n > m.cantidad) {
      return 'No hay tanto';
    }
    return null;
  }

  /** Cuánto quedaría con lo escrito (null si aún no hay una cantidad válida). */
  quedaria(): number | null {
    const m = this.material();
    const n = aNumero(this.movimiento.controls.cantidad.value);
    if (!m || n === null || n <= 0) {
      return null;
    }
    const resultado =
      this.movimiento.controls.tipo.value === 'ENTRADA' ? m.cantidad + n : m.cantidad - n;
    return Math.round(resultado * 100) / 100;
  }

  registrarMovimiento(): void {
    const m = this.material();
    const cantidad = aNumero(this.movimiento.controls.cantidad.value);
    this.movimiento.markAllAsTouched();
    if (!m || this.movimiento.invalid || cantidad === null || this.errorCantidad()) {
      const problema = this.movimiento.controls.cantidad.valid ? this.errorCantidad() : null;
      // Qué falta, en un aviso que hay que aceptar (dueño 2026-10-20).
      const aviso = avisoFaltantes(
        this.movimiento,
        'registrar el movimiento',
        { tipo: 'el tipo', cantidad: 'la cantidad', razon: 'la razón' },
        problema ? [`la cantidad (${problema.toLowerCase()})`] : [],
      );
      if (aviso) {
        void this.confirmacion.avisar(aviso);
      }
      return;
    }
    if (this.guardando()) {
      return;
    }
    const v = this.movimiento.getRawValue();
    this.guardando.set(true);
    this.error.set(null);
    this.service
      .mover(m.id, { tipo: v.tipo, cantidad, razon: v.razon.trim() }, this.clave)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (material) => {
          this.guardando.set(false);
          this.borradorMovimiento?.olvidar();
          this.clave = nuevaClave();
          this.movimiento.reset({ tipo: v.tipo, cantidad: '', razon: '' });
          this.alActualizar(material);
          this.cargarHistorial(0);
          this.cambiado.emit({
            material,
            mensaje: v.tipo === 'ENTRADA' ? 'Entrada registrada.' : 'Salida registrada.',
            nuevo: false,
          });
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo registrar el movimiento.'));
        },
      });
  }

  // ── Datos del material ────────────────────────────────────

  guardarDatos(): void {
    const stockMinimo = aNumero(this.datos.controls.stockMinimo.value);
    const inicial = aNumero(this.datos.controls.cantidadInicial.value);
    this.datos.markAllAsTouched();
    if (this.datos.invalid || stockMinimo === null) {
      // Qué falta, en un aviso que hay que aceptar (dueño 2026-10-20).
      const aviso = avisoFaltantes(
        this.datos,
        this.materialId() ? 'guardar el material' : 'crear el material',
        {
          nombre: 'el nombre',
          unidad: 'la unidad',
          stockMinimo: 'el stock mínimo',
          cantidadInicial: 'la cantidad inicial',
        },
        [],
      );
      if (aviso) {
        void this.confirmacion.avisar(aviso);
      }
      return;
    }
    if (this.guardando()) {
      return;
    }
    const v = this.datos.getRawValue();
    const actual = this.material();
    this.guardando.set(true);
    this.error.set(null);
    const peticion = actual
      ? this.service.actualizar(actual.id, actual.version, {
          nombre: v.nombre.trim(),
          unidad: v.unidad,
          stockMinimo,
        })
      : this.service.crear({
          nombre: v.nombre.trim(),
          unidad: v.unidad,
          stockMinimo,
          cantidadInicial: inicial,
        });
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (material) => {
        this.guardando.set(false);
        this.borradorDatos.olvidar();
        if (actual) {
          // Lo guardado pasa a ser la referencia: cerrar ya no pide descartar.
          this.material.set(material);
          this.llenarDatos(material);
        } else {
          this.datosGuardados = JSON.stringify(this.datos.getRawValue());
        }
        this.cambiado.emit({
          material,
          mensaje: actual ? 'Cambios guardados.' : 'Material creado.',
          nuevo: !actual,
        });
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeDeError(err, 'No se pudo guardar el material.'));
      },
    });
  }

  /** "Limpiar" (nuevo) o "Deshacer" (edición): vuelve a lo guardado. */
  async limpiarDatos(): Promise<void> {
    if (this.datosCambiados() && !(await this.confirmarDescarte())) {
      return;
    }
    this.borradorDatos.olvidar();
    const m = this.material();
    if (m) {
      this.llenarDatos(m);
    } else {
      this.datos.reset({ nombre: '', unidad: 'METRO', stockMinimo: '0', cantidadInicial: '' });
      this.datosGuardados = JSON.stringify(this.datos.getRawValue());
    }
  }

  async cambiarEstado(): Promise<void> {
    const m = this.material();
    if (!m || this.guardando()) {
      return;
    }
    if (m.activo) {
      const ok = await this.confirmacion.pedir({
        titulo: `¿Desactivar ${m.nombre}?`,
        mensaje:
          'Dejará de verse en la lista de materiales y no se podrán registrar entradas ni salidas. Su historial se conserva y lo puedes reactivar.',
        aceptar: 'Sí, desactivar',
        peligro: true,
      });
      if (!ok) {
        return;
      }
    }
    this.guardando.set(true);
    this.error.set(null);
    (m.activo ? this.service.desactivar(m.id) : this.service.reactivar(m.id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (material) => {
          this.guardando.set(false);
          this.alActualizar(material);
          this.cambiado.emit({
            material,
            mensaje: material.activo ? 'Material reactivado.' : 'Material desactivado.',
            nuevo: false,
          });
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo cambiar el estado del material.'));
        },
      });
  }

  // ── Historial ─────────────────────────────────────────────

  irAPaginaHistorial(pagina: number): void {
    if (pagina >= 0 && pagina < this.totalPaginasHistorial()) {
      this.cargarHistorial(pagina);
    }
  }

  // ── Cerrar ────────────────────────────────────────────────

  /** ✕, fondo o Escape: si hay algo escrito sin guardar, pide confirmar. */
  async cerrar(): Promise<void> {
    if (this.hayCambios() && !(await this.confirmarDescarte())) {
      return;
    }
    this.cerrado.emit();
  }

  private datosCambiados(): boolean {
    return JSON.stringify(this.datos.getRawValue()) !== this.datosGuardados;
  }

  private confirmarDescarte(): Promise<boolean> {
    return this.confirmacion.pedir({
      titulo: '¿Descartar lo escrito?',
      mensaje: 'Lo que escribiste en este material no se guardará.',
      aceptar: 'Sí, descartar',
      cancelar: 'Seguir editando',
      peligro: true,
    });
  }

  private alActualizar(material: Material): void {
    this.material.set(material);
    if (!this.datosCambiados()) {
      this.llenarDatos(material);
    }
  }

  private llenarDatos(m: Material): void {
    this.datos.reset({
      nombre: m.nombre,
      unidad: m.unidad,
      stockMinimo: aTexto(m.stockMinimo),
      cantidadInicial: '',
    });
    this.datosGuardados = JSON.stringify(this.datos.getRawValue());
  }

  private cargar(id: string): void {
    this.cargando.set(true);
    this.service
      .obtener(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (m) => {
          this.material.set(m);
          this.llenarDatos(m);
          const guardado = this.borradorDatos.leer();
          // El borrador solo vale si es de esta misma versión (si no, otro ya lo cambió).
          if (guardado && guardado.version === m.version) {
            this.datos.patchValue(guardado.valores);
            this.datos.markAsDirty();
          }
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo cargar el material.'));
        },
      });
    this.cargarHistorial(0);
  }

  private cargarHistorial(pagina: number): void {
    const id = this.materialId();
    if (!id) {
      return;
    }
    this.cargandoHistorial.set(true);
    this.service
      .historial(id, pagina, TAMANO_HISTORIAL)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.historial.set(p.contenido);
          this.paginaHistorial.set(p.pagina);
          this.totalPaginasHistorial.set(p.totalPaginas);
          this.cargandoHistorial.set(false);
        },
        error: (err: unknown) => {
          this.cargandoHistorial.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo cargar el historial.'));
        },
      });
  }
}
