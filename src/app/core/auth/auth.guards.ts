import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from './auth.model';
import { AuthService } from './auth.service';

/**
 * Guards de navegacion. Solo mejoran la experiencia: la autorizacion real
 * siempre la verifica el backend (Reglas §8.2).
 */

/** Exige una sesion activa. */
export const autenticadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() ? true : inject(Router).createUrlTree(['/login']);
};

/** Exige una sesion con al menos uno de los roles indicados. */
export function rolGuard(...permitidos: Rol[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.autenticado()) {
      return router.createUrlTree(['/login']);
    }
    return auth.roles().some((rol) => permitidos.includes(rol))
      ? true
      : router.createUrlTree([auth.rutaInicial()]);
  };
}

/** Pantallas solo para quien NO ha iniciado sesion (login, selector). */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() ? inject(Router).createUrlTree([auth.rutaInicial()]) : true;
};
