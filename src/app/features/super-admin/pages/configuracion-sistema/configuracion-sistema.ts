import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import { ConfiguracionSistema } from '../../models/plataforma.model';
import { EstadoSuperAdmin } from '../../services/estado-super-admin';
import { PlataformaService } from '../../services/plataforma.service';

/** Límites de cada valor (iguales a los del backend). */
export const LIMITES_CONFIGURACION = {
  prueba: { min: 1, max: 90 },
  aviso: { min: 1, max: 30 },
} as const;

/**
 * Configuración del sistema (Manual §16): días de prueba de las sastrerías nuevas y con cuántos
 * días de anticipación se avisa el vencimiento. Todos los SuperAdmins la ven; solo el principal
 * la cambia (con confirmación, y queda en el registro).
 */
@Component({
  selector: 'app-super-admin-configuracion',
  imports: [ReactiveFormsModule, Encabezado, TituloBloque, FechaHoraPipe],
  templateUrl: './configuracion-sistema.html',
  styleUrl: './configuracion-sistema.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminConfiguracion implements OnInit {
  private readonly service = inject(PlataformaService);
  private readonly confirmacion = inject(Confirmacion);
  private readonly notificaciones = inject(Notificaciones);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly estado = inject(EstadoSuperAdmin);

  readonly limites = LIMITES_CONFIGURACION;

  readonly config = signal<ConfiguracionSistema | null>(null);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);

  readonly puedeEditar = computed(() => this.config()?.puedeEditar ?? false);
  /** Botones visibles: si puedo editar o, mientras carga, si soy el principal (misma forma). */
  readonly conAcciones = computed(() =>
    this.config() ? this.puedeEditar() : this.estado.principal(),
  );

  readonly form = this.fb.nonNullable.group({
    diasPrueba: [
      15,
      [
        Validators.required,
        Validators.min(LIMITES_CONFIGURACION.prueba.min),
        Validators.max(LIMITES_CONFIGURACION.prueba.max),
      ],
    ],
    diasAviso: [
      7,
      [
        Validators.required,
        Validators.min(LIMITES_CONFIGURACION.aviso.min),
        Validators.max(LIMITES_CONFIGURACION.aviso.max),
      ],
    ],
  });

  private readonly valores = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  /** Hay cambios reales (compara valores, no `dirty`). */
  readonly hayCambios = computed(() => {
    const c = this.config();
    const v = this.valores();
    return !!c && (Number(v.diasPrueba) !== c.diasPrueba || Number(v.diasAviso) !== c.diasAviso);
  });

  constructor() {
    // Solo el principal edita; mientras carga, todo deshabilitado.
    effect(() => {
      if (this.puedeEditar()) {
        this.form.enable({ emitEvent: false });
      } else {
        this.form.disable({ emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.service
      .configuracion()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => this.aplicar(c),
        error: (err: unknown) =>
          this.error.set(mensajeDeError(err, 'No se pudo cargar la configuración.')),
      });
  }

  descartar(): void {
    const c = this.config();
    if (c) {
      this.form.reset({ diasPrueba: c.diasPrueba, diasAviso: c.diasAviso });
    }
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.hayCambios() || this.guardando()) {
      return;
    }
    const { diasPrueba, diasAviso } = this.form.getRawValue();
    const ok = await this.confirmacion.pedir({
      titulo: '¿Guardar la configuración?',
      mensaje: `Las sastrerías nuevas tendrán ${diasPrueba} ${diasPrueba === 1 ? 'día' : 'días'} de prueba y el vencimiento se avisará ${diasAviso} ${diasAviso === 1 ? 'día' : 'días'} antes. Queda en el registro.`,
      aceptar: 'Sí, guardar',
    });
    if (!ok) {
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    this.service
      .guardarConfiguracion(Number(diasPrueba), Number(diasAviso))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.guardando.set(false);
          this.aplicar(c);
          this.notificaciones.exito('Configuración guardada.');
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo guardar la configuración.'));
        },
      });
  }

  private aplicar(c: ConfiguracionSistema): void {
    this.config.set(c);
    this.form.reset({ diasPrueba: c.diasPrueba, diasAviso: c.diasAviso });
  }
}
