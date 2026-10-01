import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

/**
 * Inicio (placeholder) tras iniciar sesion en una sastreria. Se reemplazara
 * por el panel real con los modulos de negocio.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly auth = inject(AuthService);
  readonly sesion = this.auth.sesion;

  cerrarSesion(): void {
    this.auth.cerrarSesion();
  }
}
