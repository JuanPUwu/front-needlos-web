import { inject } from '@angular/core';
import { RedirectFunction, Router, Routes } from '@angular/router';
import { NombreIcono } from './shared/ui/icono/icono';
import { autenticadoGuard, invitadoGuard, rolGuard } from './core/auth/auth.guards';

/** El detalle y la edición de un pedido son un popup sobre el listado (`?pedido=`). */
const aPopupDePedido: RedirectFunction = ({ params }) =>
  inject(Router).createUrlTree(['/pedidos'], { queryParams: { pedido: params['id'] } });

/** Secciones de negocio aún en construcción (placeholder con su título). */
const placeholder = (titulo: string, icono: NombreIcono) => ({
  canActivate: [rolGuard('SASTRE', 'SASTRE_ADMIN')],
  data: { titulo, icono },
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

  {
    // Ticket imprimible: sin barra lateral, para que al imprimir solo salga el ticket.
    path: 'ticket/:id',
    canActivate: [rolGuard('SASTRE', 'SASTRE_ADMIN')],
    loadComponent: () =>
      import('./features/pedidos/pages/ticket/ticket-pagina').then((m) => m.TicketPagina),
  },

  // ── App autenticada (marco con barra lateral) ─────────────────────
  {
    path: '',
    canActivate: [autenticadoGuard],
    loadComponent: () => import('./features/panel/pages/panel/panel').then((m) => m.Panel),
    children: [
      {
        path: 'pedidos',
        canActivate: [rolGuard('SASTRE', 'SASTRE_ADMIN')],
        loadComponent: () =>
          import('./features/pedidos/pages/pedidos/pedidos').then((m) => m.Pedidos),
      },
      // "Nuevo pedido" también es un popup (`?nuevo=1`); el enlace viejo lo abre.
      { path: 'pedidos/nuevo', redirectTo: '/pedidos?nuevo=1' },
      // Enlaces viejos a /pedidos/:id(/editar) abren el popup.
      { path: 'pedidos/:id/editar', redirectTo: aPopupDePedido },
      { path: 'pedidos/:id', redirectTo: aPopupDePedido },
      {
        path: 'clientes',
        canActivate: [rolGuard('SASTRE', 'SASTRE_ADMIN')],
        loadComponent: () =>
          import('./features/clientes/pages/clientes/clientes').then((m) => m.Clientes),
      },
      {
        // Catálogo de prendas: se entra desde Ajustes (solo admin).
        path: 'catalogo',
        canActivate: [rolGuard('SASTRE_ADMIN')],
        loadComponent: () =>
          import('./features/catalogo/pages/catalogo/catalogo').then((m) => m.Catalogo),
      },
      { path: 'inventario', ...placeholder('Inventario', 'inventario') },
      { path: 'gastos', ...placeholder('Gastos', 'gastos') },
      { path: 'caja', ...placeholder('Caja', 'caja') },
      { path: 'nomina', ...placeholder('Nómina', 'nomina') },
      { path: 'informes', ...placeholder('Informes', 'informes') },
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
