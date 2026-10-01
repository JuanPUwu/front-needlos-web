import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

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

  cerrarSesion(): void {
    this.auth.cerrarSesion();
  }
}
