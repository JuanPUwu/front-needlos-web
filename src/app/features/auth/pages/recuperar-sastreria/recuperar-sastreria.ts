import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { Icono } from '../../../../shared/ui/icono/icono';
import { Logo } from '../../../../shared/ui/logo/logo';
import { PiePublico } from '../../../../shared/ui/pie-publico/pie-publico';

/**
 * El admin inició sesión y su sastrería está en eliminación (Manual §16.1): ve hasta cuándo se
 * conserva y la puede recuperar él mismo; al recuperarla, entra. Sin una recuperación pendiente
 * (p. ej. al recargar), vuelve al login.
 */
@Component({
  selector: 'app-recuperar-sastreria',
  imports: [Logo, Icono, FechaHoraPipe, PiePublico],
  templateUrl: './recuperar-sastreria.html',
  styleUrl: './recuperar-sastreria.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecuperarSastreria {
  private readonly auth = inject(AuthService);
  private readonly notificaciones = inject(Notificaciones);
  private readonly destroyRef = inject(DestroyRef);

  readonly pendiente = this.auth.recuperacionPendiente;
  /** Sastrería que se está recuperando (id). */
  readonly recuperando = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    if (!this.pendiente()) {
      inject(Router).navigate(['/login']);
    }
  }

  recuperar(tenantId: string, nombre: string): void {
    if (this.recuperando()) {
      return;
    }
    this.recuperando.set(tenantId);
    this.error.set(null);
    this.auth
      .recuperarSastreria(tenantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.notificaciones.exito(`Recuperaste ${nombre}: ya no se eliminará.`),
        error: (err: unknown) => {
          this.recuperando.set(null);
          this.error.set(mensajeDeError(err, 'No se pudo recuperar la sastrería.'));
        },
      });
  }

  cancelar(): void {
    this.auth.cancelarRecuperacion();
  }
}
