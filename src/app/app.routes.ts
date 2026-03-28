import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { APP_ROUTES } from './core/constants/app-constants';

export const routes: Routes = [
  {
    path: APP_ROUTES.LOGIN,
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: APP_ROUTES.HOME,
        loadComponent: () => import('./pages/home/home').then((m) => m.Home),
      },
      { path: '', redirectTo: APP_ROUTES.HOME, pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: APP_ROUTES.HOME },
];
