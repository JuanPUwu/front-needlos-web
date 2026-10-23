import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { codigoDeError, mensajeDeError } from '../../../../core/http/api-error';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { Icono } from '../../../../shared/ui/icono/icono';
import { avisoFaltantes } from '../../../../shared/util/faltantes';
import {
  ERROR_TELEFONO,
  telefonoColombia,
} from '../../../../shared/validators/telefono.validators';

/**
 * Registro con Google, último paso (dueño 2026-10-22): Google da el nombre, el apellido y el
 * correo; aquí se piden el documento (obligatorio) y el teléfono (opcional), como en el registro
 * con correo, y se crea la sastrería.
 */
@Component({
  selector: 'app-completar-google-modal',
  imports: [ReactiveFormsModule, Encabezado, Icono],
  templateUrl: './completar-google-modal.html',
  styleUrl: './completar-google-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cerrar()' },
})
export class CompletarGoogleModal implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly confirmacion = inject(Confirmacion);
  private readonly destroyRef = inject(DestroyRef);

  /** ID token que entregó Google (se envía al servidor, que lo verifica). */
  readonly idToken = input.required<string>();
  readonly nombreSastreria = input.required<string>();
  readonly cerrado = output<void>();
  /** El nombre de la sastrería ya existe: se cierra y el registro marca el campo. */
  readonly nombreEnUso = output<string>();

  readonly errorFormatoTelefono = ERROR_TELEFONO;
  readonly creando = signal(false);
  readonly error = signal<string | null>(null);

  /** Correo y nombre de la cuenta de Google, solo para mostrarlos (los valida el servidor). */
  readonly cuenta = computed(() => datosDelToken(this.idToken()));

  readonly form = inject(FormBuilder).nonNullable.group({
    numeroDocumento: [
      '',
      [Validators.required, Validators.maxLength(30), Validators.pattern(/\S/)],
    ],
    telefono: ['', [telefonoColombia]],
  });

  private readonly focoPrevio = document.activeElement as HTMLElement | null;

  ngOnDestroy(): void {
    this.focoPrevio?.focus?.();
  }

  /** Cerrar (✕, Cancelar, Escape o el fondo): con algo escrito pide confirmar (Reglas §12.3). */
  async cerrar(): Promise<void> {
    if (this.creando()) {
      return;
    }
    if (
      this.form.dirty &&
      !(await this.confirmacion.pedir({
        titulo: '¿Descartar lo que escribiste?',
        mensaje: 'Lo que escribiste no se guardará.',
        aceptar: 'Sí, descartar',
        cancelar: 'Seguir editando',
        peligro: true,
      }))
    ) {
      return;
    }
    this.cerrado.emit();
  }

  crear(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const aviso = avisoFaltantes(this.form, 'crear tu sastrería', {
        numeroDocumento: 'tu documento',
        telefono: 'el teléfono',
      });
      if (aviso) {
        void this.confirmacion.avisar(aviso);
      }
      return;
    }
    if (this.creando()) {
      return;
    }
    this.creando.set(true);
    this.error.set(null);
    const { numeroDocumento, telefono } = this.form.getRawValue();
    this.auth
      .registrarSastreriaGoogle({
        idToken: this.idToken(),
        nombreSastreria: this.nombreSastreria(),
        numeroDocumento: numeroDocumento.trim(),
        telefono: telefono.trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err: unknown) => {
          this.creando.set(false);
          if (codigoDeError(err) === 'NOMBRE_SASTRERIA_EN_USO') {
            this.nombreEnUso.emit(mensajeDeError(err, 'Ese nombre ya existe.'));
            return;
          }
          this.error.set(mensajeDeError(err, 'No se pudo registrar la sastrería con Google.'));
        },
      });
  }
}

/** Lee (sin validar) el correo y el nombre del ID token de Google. */
function datosDelToken(idToken: string): { email: string; nombre: string } | null {
  try {
    const base64 = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    const datos = JSON.parse(json) as { email?: string; name?: string };
    return datos.email ? { email: datos.email, nombre: datos.name ?? '' } : null;
  } catch {
    return null;
  }
}
