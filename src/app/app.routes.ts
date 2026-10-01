import { Routes } from '@angular/router';
import { autenticadoGuard, invitadoGuard, rolGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.Login),
  },
  {
    path: 'registrar-sastreria',
    canActivate: [invitadoGuard],
    loadComponent: () =>
      import('./features/auth/pages/registrar-sastreria/registrar-sastreria').then(
        (m) => m.RegistrarSastreria,
      ),
  },
  {
    // Sin guard: llega desde el registro con el email por router state, no por sesion.
    path: 'verificar-correo',
    loadComponent: () =>
      import('./features/auth/pages/verificar-correo/verificar-correo').then(
        (m) => m.VerificarCorreo,
      ),
  },
  {
    path: 'recuperar-contrasena',
    canActivate: [invitadoGuard],
    loadComponent: () =>
      import('./features/auth/pages/recuperar-contrasena/recuperar-contrasena').then(
        (m) => m.RecuperarContrasena,
      ),
  },
  {
    // Sin guard: el enlace del correo debe abrirse aunque haya una sesion iniciada.
    path: 'restablecer-contrasena',
    loadComponent: () =>
      import('./features/auth/pages/restablecer-contrasena/restablecer-contrasena').then(
        (m) => m.RestablecerContrasena,
      ),
  },
  {
    path: 'elegir-sastreria',
    canActivate: [invitadoGuard],
    loadComponent: () =>
      import('./features/auth/pages/seleccionar-sastreria/seleccionar-sastreria').then(
        (m) => m.SeleccionarSastreria,
      ),
  },
  {
    path: 'inicio',
    canActivate: [rolGuard('SASTRE', 'SASTRE_ADMIN')],
    loadComponent: () => import('./features/home/pages/home/home').then((m) => m.Home),
  },
  {
    path: 'super-admin',
    canActivate: [rolGuard('SUPER_ADMIN')],
    loadComponent: () =>
      import('./features/super-admin/pages/dashboard/dashboard').then((m) => m.SuperAdminDashboard),
  },
  {
    path: 'mi-cuenta',
    canActivate: [autenticadoGuard],
    loadComponent: () =>
      import('./features/cuenta/pages/mi-cuenta/mi-cuenta').then((m) => m.MiCuenta),
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
