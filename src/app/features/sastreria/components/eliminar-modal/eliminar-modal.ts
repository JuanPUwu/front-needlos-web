import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { Icono } from '../../../../shared/ui/icono/icono';
import { avisoFaltantes } from '../../../../shared/util/faltantes';
import { SastreriaService } from '../../services/sastreria.service';

/**
 * Eliminar la sastrería (Manual §16.1): explica qué pasa (nadie entra desde ya; se conserva 90
 * días y su admin la recupera iniciando sesión; luego se borra todo menos lo de facturación),
 * recomienda exportar antes y pide la contraseña y el nombre de la sastrería escrito a mano.
 */
@Component({
  selector: 'app-eliminar-modal',
  imports: [ReactiveFormsModule, Encabezado, Icono],
  templateUrl: './eliminar-modal.html',
  styleUrl: './eliminar-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cerrar()' },
})
export class EliminarModal implements OnDestroy {
  private readonly service = inject(SastreriaService);
  private readonly auth = inject(AuthService);
  private readonly confirmacion = inject(Confirmacion);
  private readonly notificaciones = inject(Notificaciones);
  private readonly destroyRef = inject(DestroyRef);

  readonly sastreria = input.required<string>();
  /** Con plan puede exportar antes de irse. */
  readonly puedeExportar = input(false);
  readonly cerrado = output<void>();
  /** Quiere exportar primero: se cierra este popup y se abre el de exportar. */
  readonly exportar = output<void>();

  readonly eliminando = signal(false);
  readonly error = signal<string | null>(null);
  readonly verClave = signal(false);

  readonly form = inject(FormBuilder).nonNullable.group({
    confirmacion: ['', [Validators.required]],
    nombre: ['', [Validators.required]],
  });

  private readonly focoPrevio = document.activeElement as HTMLElement | null;

  ngOnDestroy(): void {
    this.focoPrevio?.focus?.();
  }

  cerrar(): void {
    if (!this.eliminando()) {
      this.cerrado.emit();
    }
  }

  async eliminar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const aviso = avisoFaltantes(this.form, 'eliminar la sastrería', {
        confirmacion: 'tu contraseña',
        nombre: 'el nombre de la sastrería',
      });
      if (aviso) {
        void this.confirmacion.avisar(aviso);
      }
      return;
    }
    const ok = await this.confirmacion.pedir({
      titulo: `¿Eliminar ${this.sastreria()}?`,
      mensaje:
        'Nadie de tu equipo podrá entrar desde ahora. Tienes 90 días para recuperarla iniciando sesión con tu cuenta; después se borra para siempre.',
      aceptar: 'Sí, eliminar',
      peligro: true,
    });
    if (!ok) {
      return;
    }
    const { confirmacion, nombre } = this.form.getRawValue();
    this.eliminando.set(true);
    this.error.set(null);
    this.service
      .eliminar(confirmacion, nombre)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificaciones.info(
            'Tu sastrería se eliminó. Si cambias de opinión, inicia sesión antes de 90 días y podrás recuperarla.',
          );
          // Sus sesiones ya se cerraron en el servidor: se limpia todo y vuelve al inicio.
          this.auth.cerrarSesion();
        },
        error: (err: unknown) => {
          this.eliminando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo eliminar la sastrería.'));
        },
      });
  }
}
