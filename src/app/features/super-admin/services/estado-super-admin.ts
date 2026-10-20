import { Injectable, effect, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { escribirAlmacen, leerAlmacen } from '../../../core/estado/almacen';
import { PlataformaService } from './plataforma.service';

const CLAVE = 'superadmin-principal';

/**
 * Si el SuperAdmin de la sesión es el principal (Manual §16): decide qué puede gestionar
 * (SuperAdmins, configuración) y cómo se arma cada pantalla mientras carga. Se recuerda el último
 * valor para que el esqueleto tenga la misma forma que el contenido.
 */
@Injectable({ providedIn: 'root' })
export class EstadoSuperAdmin {
  private readonly auth = inject(AuthService);
  private readonly service = inject(PlataformaService);

  readonly principal = signal(leerAlmacen(localStorage, CLAVE) === 'true');
  readonly cargado = signal(false);

  constructor() {
    effect(() => {
      const esSuperAdmin = this.auth.roles().includes('SUPER_ADMIN');
      if (!esSuperAdmin) {
        this.cargado.set(false);
        return;
      }
      this.service.yo().subscribe({
        next: ({ principal }) => {
          this.principal.set(principal);
          this.cargado.set(true);
          escribirAlmacen(localStorage, CLAVE, String(principal));
        },
        error: () => this.cargado.set(true),
      });
    });
  }
}
