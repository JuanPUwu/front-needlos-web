import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  inject,
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

/**
 * Crear otra sastrería con la misma cuenta (dueño 2026-10-20): solo el nombre; queda como su
 * administrador, con su propia prueba gratis y su propio plan, y se entra a ella.
 */
@Component({
  selector: 'app-crear-sastreria-modal',
  imports: [ReactiveFormsModule, Encabezado, Icono],
  templateUrl: './crear-sastreria-modal.html',
  styleUrl: './crear-sastreria-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cerrar()' },
})
export class CrearSastreriaModal implements OnDestroy {
  /**
   * Nombre que el servidor rechazó por estar en uso (dos sastrerías no pueden llamarse igual):
   * mientras el campo siga con ese nombre, su línea dice "Ya existe".
   */
  readonly nombreRechazado = signal<string | null>(null);
  private readonly auth = inject(AuthService);
  private readonly confirmacion = inject(Confirmacion);
  private readonly destroyRef = inject(DestroyRef);

  readonly cerrado = output<void>();
  readonly creando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120), Validators.pattern(/\S/)]],
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
      const aviso = avisoFaltantes(this.form, 'crear la sastrería', {
        nombre: 'el nombre de la sastrería',
      });
      if (aviso) {
        void this.confirmacion.avisar(aviso);
      }
      return;
    }
    this.creando.set(true);
    this.error.set(null);
    this.auth
      .crearOtraSastreria(this.form.controls.nombre.value.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err: unknown) => {
          this.creando.set(false);
          if (codigoDeError(err) === 'NOMBRE_SASTRERIA_EN_USO') {
            this.nombreRechazado.set(this.form.controls.nombre.value.trim());
          }
          this.error.set(mensajeDeError(err, 'No se pudo crear la sastrería.'));
        },
      });
  }
}
