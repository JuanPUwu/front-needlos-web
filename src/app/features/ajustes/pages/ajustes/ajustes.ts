import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

/** Ajustes: accesos a la configuración de la sastrería y de la cuenta, y cerrar sesión. */
@Component({
  selector: 'app-ajustes',
  imports: [RouterLink],
  templateUrl: './ajustes.html',
  styleUrl: './ajustes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Ajustes {
  private readonly auth = inject(AuthService);
  readonly esAdmin = computed(() => this.auth.roles().includes('SASTRE_ADMIN'));

  cerrarSesion(): void {
    this.auth.cerrarSesion();
  }
}
