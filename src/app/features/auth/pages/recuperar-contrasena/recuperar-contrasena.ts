import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Logo } from '../../../../shared/ui/logo/logo';
import { RecuperacionContrasenaService } from '../../services/recuperacion-contrasena.service';

/**
 * "¿Olvidaste tu contrasena?": pide el correo y muestra siempre el mismo
 * mensaje, exista o no la cuenta (no se revela que correos estan registrados).
 */
@Component({
  selector: 'app-recuperar-contrasena',
  imports: [ReactiveFormsModule, RouterLink, Logo],
  templateUrl: './recuperar-contrasena.html',
  styleUrl: './recuperar-contrasena.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecuperarContrasena {
  private readonly fb = inject(FormBuilder);
  private readonly recuperacion = inject(RecuperacionContrasenaService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cargando = signal(false);
  readonly enviado = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
  });

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.cargando()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    this.recuperacion
      .solicitar(this.form.getRawValue().email.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.enviado.set(true);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(
            mensajeDeError(err, 'No se pudo enviar la solicitud. Inténtalo de nuevo.'),
          );
        },
      });
  }
}
