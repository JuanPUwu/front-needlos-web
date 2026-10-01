import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Logo } from '../../../../shared/ui/logo/logo';

/**
 * Pantalla "Elige tu sastreria": aparece cuando la cuenta tiene acceso a varias.
 * Si no hay seleccion pendiente (p. ej. tras recargar), vuelve al login.
 */
@Component({
  selector: 'app-seleccionar-sastreria',
  imports: [Logo],
  templateUrl: './seleccionar-sastreria.html',
  styleUrl: './seleccionar-sastreria.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeleccionarSastreria {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly pendiente = this.auth.seleccionPendiente;
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    if (!this.auth.seleccionPendiente()) {
      this.router.navigate(['/login']);
    }
  }

  elegir(tenantId: string): void {
    if (this.cargando()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    this.auth
      .seleccionar(tenantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.cargando.set(false),
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo entrar a la sastreria.'));
        },
      });
  }
}
