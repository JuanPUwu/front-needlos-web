import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Logo } from '../../../../shared/ui/logo/logo';
import {
  POLITICA_CONTRASENA,
  camposIguales,
} from '../../../../shared/validators/contrasena.validators';
import { GoogleButton } from '../../components/google-button/google-button';

/** Al menos un caracter visible (el backend rechaza textos solo con espacios). */
const CON_TEXTO = /\S/;

/**
 * "Registrar mi sastreria": crea la sastreria en plan DEMO y la cuenta del dueno
 * (SASTRE_ADMIN), con correo y contrasena o con Google. Solo se pide el nombre
 * de la sastreria; el identificador interno lo genera el backend.
 */
@Component({
  selector: 'app-registrar-sastreria',
  imports: [ReactiveFormsModule, RouterLink, Logo, GoogleButton],
  templateUrl: './registrar-sastreria.html',
  styleUrl: './registrar-sastreria.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarSastreria {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly cargando = signal(false);
  readonly verPassword = signal(false);
  readonly error = signal<string | null>(null);

  /** Comun a los dos caminos (correo y Google). */
  readonly nombreSastreria = this.fb.nonNullable.control('', [
    Validators.required,
    Validators.maxLength(120),
    Validators.pattern(CON_TEXTO),
  ]);

  readonly form = this.fb.nonNullable.group(
    {
      nombreAdmin: [
        '',
        [Validators.required, Validators.maxLength(60), Validators.pattern(CON_TEXTO)],
      ],
      apellidoAdmin: [
        '',
        [Validators.required, Validators.maxLength(60), Validators.pattern(CON_TEXTO)],
      ],
      numeroDocumento: [
        '',
        [Validators.required, Validators.maxLength(30), Validators.pattern(CON_TEXTO)],
      ],
      telefono: ['', [Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
      password: ['', [Validators.required, Validators.pattern(POLITICA_CONTRASENA)]],
      confirmacion: ['', [Validators.required]],
    },
    { validators: camposIguales('password', 'confirmacion') },
  );

  enviar(): void {
    if (this.nombreSastreria.invalid || this.form.invalid) {
      this.nombreSastreria.markAsTouched();
      this.form.markAllAsTouched();
      return;
    }
    if (this.cargando()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    const datos = this.form.getRawValue();

    this.auth
      .registrarSastreria({
        nombreSastreria: this.nombreSastreria.value.trim(),
        nombreAdmin: datos.nombreAdmin.trim(),
        apellidoAdmin: datos.apellidoAdmin.trim(),
        numeroDocumento: datos.numeroDocumento.trim(),
        telefono: datos.telefono.trim() || null,
        email: datos.email.trim(),
        password: datos.password,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // Con correo no entra directo: falta confirmar el codigo de verificacion.
        next: (res) => {
          this.cargando.set(false);
          this.router.navigate(['/verificar-correo'], { state: { email: res.email } });
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(
            mensajeDeError(err, 'No se pudo registrar la sastrería. Inténtalo de nuevo.'),
          );
        },
      });
  }

  conGoogle(idToken: string): void {
    if (this.nombreSastreria.invalid) {
      this.nombreSastreria.markAsTouched();
      this.error.set('Escribe el nombre de tu sastrería antes de continuar con Google.');
      return;
    }
    this.ejecutar(
      this.auth.registrarSastreriaGoogle({
        idToken,
        nombreSastreria: this.nombreSastreria.value.trim(),
      }),
      'No se pudo registrar la sastrería con Google.',
    );
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
