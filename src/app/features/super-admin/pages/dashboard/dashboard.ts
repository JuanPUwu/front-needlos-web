import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { Confirmacion } from '../../../../core/ui/confirmacion';

/**
 * Panel del SUPER_ADMIN (placeholder). Sera el dashboard de todas las
 * sastrerias. El super-admin no pertenece a ninguna sastreria.
 */
@Component({
  selector: 'app-super-admin-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminDashboard {
  private readonly auth = inject(AuthService);
  private readonly confirmacion = inject(Confirmacion);

  /** Cerrar sesión se confirma (Reglas §12.2), igual que en Ajustes. */
  async cerrarSesion(): Promise<void> {
    const ok = await this.confirmacion.pedir({
      titulo: '¿Cerrar sesión?',
      mensaje: 'Saldrás de la aplicación.',
      aceptar: 'Sí, cerrar sesión',
      peligro: true,
    });
    if (ok) {
      this.auth.cerrarSesion();
    }
  }
}
