import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { codigoDeError, mensajeDeError } from '../../../../core/http/api-error';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { Logo } from '../../../../shared/ui/logo/logo';
import { PiePublico } from '../../../../shared/ui/pie-publico/pie-publico';

/**
 * Inició sesión una cuenta que no pertenece a ninguna sastrería (la sacaron de un equipo o borró
 * la suya; dueño 2026-10-22): puede crear la suya (queda de admin y entra) o pedir que la
 * inviten. Sin ese inicio de sesión pendiente (p. ej. al recargar), vuelve al login.
 */
@Component({
  selector: 'app-crear-mi-sastreria',
  imports: [ReactiveFormsModule, Logo, PiePublico],
  templateUrl: './crear-mi-sastreria.html',
  styleUrl: './crear-mi-sastreria.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrearMiSastreria {
  private readonly auth = inject(AuthService);
  private readonly notificaciones = inject(Notificaciones);
  private readonly destroyRef = inject(DestroyRef);

  readonly creando = signal(false);
  readonly error = signal<string | null>(null);
  /** Nombre que el servidor rechazó por estar en uso: su línea dice "Ya existe". */
  readonly nombreRechazado = signal<string | null>(null);

  readonly nombre = inject(FormBuilder).nonNullable.control('', [
    Validators.required,
    Validators.maxLength(120),
    Validators.pattern(/\S/),
  ]);

  constructor() {
    if (!this.auth.sinSastreriaPendiente()) {
      inject(Router).navigate(['/login']);
    }
  }

  crear(): void {
    if (this.nombre.invalid) {
      this.nombre.markAsTouched();
      return;
    }
    if (this.creando()) {
      return;
    }
    const nombre = this.nombre.value.trim();
    this.creando.set(true);
    this.error.set(null);
    this.auth
      .crearPrimeraSastreria(nombre)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.notificaciones.exito(`Creaste ${nombre}: eres su administrador.`),
        error: (err: unknown) => {
          this.creando.set(false);
          if (codigoDeError(err) === 'NOMBRE_SASTRERIA_EN_USO') {
            this.nombreRechazado.set(nombre);
          }
          this.error.set(mensajeDeError(err, 'No se pudo crear la sastrería.'));
        },
      });
  }

  cancelar(): void {
    this.auth.cancelarSinSastreria();
  }
}
