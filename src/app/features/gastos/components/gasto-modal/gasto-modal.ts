import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  afterNextRender,
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
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { FechaPipe } from '../../../../shared/pipes/fecha.pipe';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto';
import { Icono } from '../../../../shared/ui/icono/icono';
import { hoyIso, nuevaClave } from '../../../../shared/util/fechas';
import { PATRON_MONTO, aNumero, aTexto } from '../../../../shared/util/montos';
import { METODOS_PAGO, MetodoPago, etiquetaMetodo } from '../../../pedidos/models/pedido.model';
import { CambioGasto, ETIQUETA_ACCION, Gasto } from '../../models/gasto.model';
import { GastoService } from '../../services/gasto.service';

const CON_TEXTO = /\S/;

/**
 * Popup del gasto (Reglas §12.3, formulario base): sin id es "Registrando gasto"; con id es
 * "Corrigiendo gasto" y muestra al lado el historial de cambios. Recuerda el borrador, protege
 * contra el doble clic (Idempotency-Key) y pide confirmar antes de perder lo escrito.
 */
@Component({
  selector: 'app-gasto-modal',
  imports: [
    ReactiveFormsModule,
    Encabezado,
    Esqueleto,
    Icono,
    MonedaPipe,
    FechaPipe,
    FechaHoraPipe,
  ],
  templateUrl: './gasto-modal.html',
  styleUrl: './gasto-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cerrar()' },
})
export class GastoModal implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(GastoService);
  private readonly memoria = inject(Memoria);
  private readonly confirmacion = inject(Confirmacion);
  private readonly destroyRef = inject(DestroyRef);

  /** null = gasto nuevo. */
  readonly gastoId = input<string | null>(null);
  readonly guardado = output<{ gasto: Gasto; nuevo: boolean }>();
  readonly cerrado = output<void>();

  readonly metodos = METODOS_PAGO;
  readonly etiquetaMetodo = etiquetaMetodo;
  readonly etiquetaAccion = ETIQUETA_ACCION;
  readonly hoy = hoyIso();

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly gasto = signal<Gasto | null>(null);
  readonly historial = signal<CambioGasto[]>([]);

  readonly form = this.fb.nonNullable.group({
    razon: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(CON_TEXTO)]],
    monto: ['', [Validators.required, Validators.pattern(PATRON_MONTO)]],
    metodo: ['EFECTIVO' as MetodoPago, [Validators.required]],
    fecha: [hoyIso(), [Validators.required]],
  });

  private clave = nuevaClave();
  private borrador!: FormularioRecordado<{ clave?: string; version?: number }>;
  private readonly caja = viewChild.required<ElementRef<HTMLElement>>('caja');
  private readonly focoPrevio = document.activeElement as HTMLElement | null;

  constructor() {
    afterNextRender(() => this.caja().nativeElement.focus());
  }

  ngOnInit(): void {
    const id = this.gastoId();
    this.borrador = recordarFormulario(
      this.form,
      this.memoria,
      id ? `gasto-editar:${id}` : 'gasto-nuevo',
      this.destroyRef,
      { extra: () => (id ? { version: this.gasto()?.version } : { clave: this.clave }) },
    );
    if (id) {
      this.cargar(id);
      return;
    }
    const guardado = this.borrador.leer();
    if (guardado) {
      this.form.patchValue(guardado.valores);
      this.form.markAsDirty();
      this.clave = guardado.clave ?? this.clave;
    }
  }

  ngOnDestroy(): void {
    this.focoPrevio?.focus?.();
  }

  /** Monto mayor que cero (el patrón ya exige solo números). */
  montoInvalido(): boolean {
    const n = aNumero(this.form.controls.monto.value);
    return this.form.controls.monto.touched && (n === null || n <= 0);
  }

  /** ✕, fondo o Escape: si hay algo escrito sin guardar, pide confirmar. */
  async cerrar(): Promise<void> {
    if (await this.puedeDescartar()) {
      this.cerrado.emit();
    }
  }

  /** "Limpiar" (nuevo) o "Cancelar" (corrección). */
  async limpiar(): Promise<void> {
    if (!(await this.puedeDescartar())) {
      return;
    }
    this.borrador.olvidar();
    const g = this.gasto();
    if (g) {
      this.cerrado.emit();
      return;
    }
    this.clave = nuevaClave();
    this.form.reset({ razon: '', monto: '', metodo: 'EFECTIVO', fecha: hoyIso() });
  }

  guardar(): void {
    const monto = aNumero(this.form.controls.monto.value);
    if (this.form.invalid || monto === null || monto <= 0) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.guardando()) {
      return;
    }
    const v = this.form.getRawValue();
    const req = { razon: v.razon.trim(), monto, metodo: v.metodo, fecha: v.fecha };
    const actual = this.gasto();
    this.guardando.set(true);
    this.error.set(null);
    const peticion = actual
      ? this.service.corregir(actual.id, actual.version, req)
      : this.service.crear(req, this.clave);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (gasto) => {
        this.guardando.set(false);
        this.borrador.olvidar();
        this.clave = nuevaClave();
        this.form.markAsPristine();
        this.guardado.emit({ gasto, nuevo: !actual });
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeDeError(err, 'No se pudo guardar el gasto.'));
      },
    });
  }

  private async puedeDescartar(): Promise<boolean> {
    if (!this.form.dirty) {
      return true;
    }
    return this.confirmacion.pedir({
      titulo: '¿Descartar lo escrito?',
      mensaje: 'Lo que escribiste en este gasto no se guardará.',
      aceptar: 'Sí, descartar',
      cancelar: 'Seguir editando',
      peligro: true,
    });
  }

  private cargar(id: string): void {
    this.cargando.set(true);
    this.service
      .obtener(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (g) => {
          this.gasto.set(g);
          this.form.reset({
            razon: g.razon,
            monto: aTexto(g.monto),
            metodo: g.metodo,
            fecha: g.fecha,
          });
          const guardado = this.borrador.leer();
          // El borrador solo vale si es de esta misma versión (si no, otro ya lo cambió).
          if (guardado && guardado.version === g.version) {
            this.form.patchValue(guardado.valores);
            this.form.markAsDirty();
          }
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo cargar el gasto.'));
        },
      });
    this.service
      .historial(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (h) => this.historial.set([...h].reverse()), error: () => undefined });
  }
}
