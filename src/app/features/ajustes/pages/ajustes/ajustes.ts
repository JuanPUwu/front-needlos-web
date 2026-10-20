import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { AuthService } from '../../../../core/auth/auth.service';

/** Ajustes: accesos a la configuración de la sastrería y de la cuenta, y cerrar sesión. */
@Component({
  selector: 'app-ajustes',
  imports: [Encabezado, RouterLink],
  templateUrl: './ajustes.html',
  styleUrl: './ajustes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Ajustes {
  private readonly auth = inject(AuthService);
  private readonly confirmacion = inject(Confirmacion);
  readonly esAdmin = computed(() => this.auth.roles().includes('SASTRE_ADMIN'));

  async cerrarSesion(): Promise<void> {
    const ok = await this.confirmacion.pedir({
      titulo: '¿Cerrar sesión?',
      mensaje:
        'Saldrás de la aplicación y se borrarán los borradores sin guardar de este computador.',
      aceptar: 'Sí, cerrar sesión',
      peligro: true,
    });
    if (ok) {
      this.auth.cerrarSesion();
    }
  }
}
