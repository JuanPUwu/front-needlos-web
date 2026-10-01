import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { codigoDeError, mensajeDeError } from '../../../../core/http/api-error';
import { Logo } from '../../../../shared/ui/logo/logo';

/** Segundos que el boton de reenvio queda deshabilitado tras usarlo (evita doble clic). */
const ESPERA_REENVIO_S = 30;

/**
 * Pantalla de verificacion de correo tras registrarse con correo y contrasena
 * (Google no pasa por aqui: ya verifica el correo solo). El email llega por
 * `router state` desde /registrar-sastreria; sin el, no hay nada que verificar.
 */
@Component({
  selector: 'app-verificar-correo',
  imports: [ReactiveFormsModule, RouterLink, Logo],
  templateUrl: './verificar-correo.html',
  styleUrl: './verificar-correo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificarCorreo {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly email = this.leerEmail();

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly reenviando = signal(false);
  readonly reenviado = signal(false);
  readonly segundosParaReenviar = signal(0);

  readonly form = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  constructor() {
    if (!this.email) {
      this.router.navigate(['/registrar-sastreria']);
    }
  }

  enviar(): void {
    if (this.form.invalid || !this.email) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.cargando()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    this.auth
      .verificarCorreo(this.email, this.form.getRawValue().codigo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err: unknown) => {
          this.cargando.set(false);
          if (codigoDeError(err) === 'CUENTA_YA_VERIFICADA') {
            this.router.navigate(['/login']);
            return;
          }
          this.error.set(
            mensajeDeError(err, 'El código no es válido. Revísalo e inténtalo de nuevo.'),
          );
        },
        // Exito: AuthService ya guardo la sesion y navego a la pantalla inicial.
      });
  }

  reenviar(): void {
    if (this.reenviando() || this.segundosParaReenviar() > 0 || !this.email) {
      return;
    }
    this.reenviando.set(true);
    this.error.set(null);
    this.reenviado.set(false);

    this.auth
      .reenviarCodigo(this.email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.reenviando.set(false);
          this.reenviado.set(true);
          this.iniciarEsperaDeReenvio();
        },
        error: (err: unknown) => {
          this.reenviando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo reenviar el código.'));
        },
      });
  }

  private iniciarEsperaDeReenvio(): void {
    this.segundosParaReenviar.set(ESPERA_REENVIO_S);
    const intervalo = setInterval(() => {
      const restante = this.segundosParaReenviar() - 1;
      this.segundosParaReenviar.set(Math.max(0, restante));
      if (restante <= 0) {
        clearInterval(intervalo);
      }
    }, 1000);
  }

  private leerEmail(): string | null {
    const estado = history.state as { email?: string } | null;
    return estado?.email ?? null;
  }
}
