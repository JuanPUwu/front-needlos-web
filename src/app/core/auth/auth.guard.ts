import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';
import { APP_ROUTES } from '../constants/app-constants';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  // APP_INITIALIZER ya corrió antes de cualquier navegación,
  // por lo que isLoggedIn() refleja si el silent refresh funcionó.
  return auth.isLoggedIn() ? true : router.createUrlTree([`/${APP_ROUTES.LOGIN}`]);
};
