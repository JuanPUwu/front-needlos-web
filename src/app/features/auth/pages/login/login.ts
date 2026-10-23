import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { Memoria } from '../../../../core/estado/memoria';
import { AuthService } from '../../../../core/auth/auth.service';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Icono } from '../../../../shared/ui/icono/icono';
import { PiePublico } from '../../../../shared/ui/pie-publico/pie-publico';
import { Logo } from '../../../../shared/ui/logo/logo';
import { GoogleButton } from '../../components/google-button/google-button';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Logo, GoogleButton, Icono, PiePublico],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cargando = signal(false);
  readonly verPassword = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  /**
   * Formulario fuera del sistema: NUNCA recuerda lo escrito; al recargar queda limpio (dueño
   * 2026-10-22). Se borra además el borrador que pudo quedar guardado de versiones anteriores.
   */
  private readonly _sinBorrador = inject(Memoria).olvidar('login');

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.ejecutar(
      this.auth.login(this.form.getRawValue()),
      'No se pudo iniciar sesión. Revisa tus datos.',
    );
  }

  conGoogle(idToken: string): void {
    this.ejecutar(this.auth.loginGoogle(idToken), 'No se pudo iniciar sesión con Google.');
  }

  private ejecutar(accion: Observable<void>, mensajePorDefecto: string): void {
    if (this.cargando()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    accion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.cargando.set(false),
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err, mensajePorDefecto));
      },
    });
  }
}
