import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { codigoDeError, mensajeDeError } from '../../../../core/http/api-error';
import { Logo } from '../../../../shared/ui/logo/logo';
import {
  POLITICA_CONTRASENA,
  camposIguales,
} from '../../../../shared/validators/contrasena.validators';
import { RecuperacionContrasenaService } from '../../services/recuperacion-contrasena.service';

type Estado = 'formulario' | 'listo' | 'enlaceInvalido';

/**
 * Pantalla del enlace que llega por correo: /restablecer-contrasena#token=...
 * El token viaja en el fragmento (#), que el navegador nunca envia a ningun
 * servidor ni aparece en logs; al leerlo se borra de la barra de direcciones.
 */
@Component({
  selector: 'app-restablecer-contrasena',
  imports: [ReactiveFormsModule, RouterLink, Logo],
  templateUrl: './restablecer-contrasena.html',
  styleUrl: './restablecer-contrasena.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestablecerContrasena {
  private readonly fb = inject(FormBuilder);
  private readonly recuperacion = inject(RecuperacionContrasenaService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly token = this.leerToken();

  readonly estado = signal<Estado>(this.token ? 'formulario' : 'enlaceInvalido');
  readonly cargando = signal(false);
  readonly verPassword = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      contrasenaNueva: ['', [Validators.required, Validators.pattern(POLITICA_CONTRASENA)]],
      confirmacion: ['', [Validators.required]],
    },
    { validators: camposIguales('contrasenaNueva', 'confirmacion') },
  );

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.cargando() || !this.token) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    this.recuperacion
      .restablecer(this.token, this.form.getRawValue().contrasenaNueva)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.estado.set('listo');
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          if (codigoDeError(err) === 'ENLACE_RECUPERACION_INVALIDO') {
            this.estado.set('enlaceInvalido');
            return;
          }
          this.error.set(
            mensajeDeError(err, 'No se pudo cambiar la contraseña. Inténtalo de nuevo.'),
          );
        },
      });
  }

  private leerToken(): string | null {
    const fragmento = inject(ActivatedRoute).snapshot.fragment;
    const token = fragmento ? new URLSearchParams(fragmento).get('token') : null;
    if (fragmento) {
      inject(Location).replaceState('/restablecer-contrasena');
    }
    return token || null;
  }
}
