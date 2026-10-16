import { Routes } from '@angular/router';
import { autenticadoGuard, invitadoGuard, rolGuard } from './core/auth/auth.guards';

/** Secciones de negocio aún en construcción (placeholder con su título). */
const placeholder = (titulo: string) => ({
  canActivate: [rolGuard('SASTRE', 'SASTRE_ADMIN')],
  data: { titulo },
  loadComponent: () =>
    import('./shared/ui/seccion-pendiente/seccion-pendiente').then((m) => m.SeccionPendiente),
});

export const routes: Routes = [
  // ── Público ───────────────────────────────────────────────────────
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
    // Sin guard: el enlace de invitación debe abrirse con o sin sesión.
    path: 'aceptar-invitacion',
    loadComponent: () =>
      import('./features/auth/pages/aceptar-invitacion/aceptar-invitacion').then(
        (m) => m.AceptarInvitacion,
      ),
  },
  {
    // Selector de sastreria (hoy no se usa en el login: se entra directo a la primera).
    // Se conservará para el cambio de sastreria dentro de la app.
    path: 'elegir-sastreria',
    canActivate: [invitadoGuard],
    loadComponent: () =>
      import('./features/auth/pages/seleccionar-sastreria/seleccionar-sastreria').then(
        (m) => m.SeleccionarSastreria,
      ),
  },
  {
    path: 'super-admin',
    canActivate: [rolGuard('SUPER_ADMIN')],
    loadComponent: () =>
      import('./features/super-admin/pages/dashboard/dashboard').then((m) => m.SuperAdminDashboard),
  },

  // ── App autenticada (marco con barra lateral) ─────────────────────
  {
    path: '',
    canActivate: [autenticadoGuard],
    loadComponent: () => import('./features/panel/pages/panel/panel').then((m) => m.Panel),
    children: [
      { path: 'pedidos', ...placeholder('Pedidos') },
      { path: 'inventario', ...placeholder('Inventario') },
      { path: 'gastos', ...placeholder('Gastos') },
      { path: 'caja', ...placeholder('Caja') },
      { path: 'nomina', ...placeholder('Nómina') },
      { path: 'informes', ...placeholder('Informes') },
      {
        path: 'equipo',
        canActivate: [rolGuard('SASTRE_ADMIN')],
        loadComponent: () => import('./features/equipo/pages/equipo/equipo').then((m) => m.Equipo),
      },
      {
        path: 'sastreria',
        canActivate: [rolGuard('SASTRE_ADMIN')],
        loadComponent: () =>
          import('./features/sastreria/pages/configuracion/configuracion').then(
            (m) => m.ConfiguracionSastreria,
          ),
      },
      {
        path: 'ajustes',
        canActivate: [autenticadoGuard],
        loadComponent: () =>
          import('./features/ajustes/pages/ajustes/ajustes').then((m) => m.Ajustes),
      },
      {
        path: 'mi-cuenta',
        canActivate: [autenticadoGuard],
        loadComponent: () =>
          import('./features/cuenta/pages/mi-cuenta/mi-cuenta').then((m) => m.MiCuenta),
      },
      { path: '', pathMatch: 'full', redirectTo: 'pedidos' },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
