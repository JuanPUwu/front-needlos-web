import { inject } from '@angular/core';
import { RedirectFunction, Router, Routes } from '@angular/router';
import { autenticadoGuard, invitadoGuard, rolGuard } from './core/auth/auth.guards';

/** El detalle y la edición de un pedido son un popup sobre el listado (`?pedido=`). */
const aPopupDePedido: RedirectFunction = ({ params }) =>
  inject(Router).createUrlTree(['/pedidos'], { queryParams: { pedido: params['id'] } });

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
    // Sin guard: invitación para ser SuperAdmin (cuenta nueva; define su contraseña).
    path: 'aceptar-superadmin',
    loadComponent: () =>
      import('./features/auth/pages/aceptar-superadmin/aceptar-superadmin').then(
        (m) => m.AceptarSuperAdmin,
      ),
  },
  {
    // Su sastrería está en eliminación: el admin la puede recuperar (Manual §16.1).
    path: 'recuperar-sastreria',
    canActivate: [invitadoGuard],
    loadComponent: () =>
      import('./features/auth/pages/recuperar-sastreria/recuperar-sastreria').then(
        (m) => m.RecuperarSastreria,
      ),
  },
  {
    // La cuenta no pertenece a ninguna sastrería: crea la suya o pide que la inviten.
    path: 'crear-mi-sastreria',
    canActivate: [invitadoGuard],
    loadComponent: () =>
      import('./features/auth/pages/crear-mi-sastreria/crear-mi-sastreria').then(
        (m) => m.CrearMiSastreria,
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
    // Ticket imprimible: sin barra lateral, para que al imprimir solo salga el ticket.
    path: 'ticket/:id',
    canActivate: [rolGuard('SASTRE', 'SASTRE_ADMIN')],
    loadComponent: () =>
      import('./features/pedidos/pages/ticket/ticket-pagina').then((m) => m.TicketPagina),
  },

  // ── Páginas públicas (con o sin sesión; Manual §16.1, entrega H) ──
  {
    path: 'sobre-nosotros',
    loadComponent: () =>
      import('./features/publico/pages/sobre-nosotros/sobre-nosotros').then((m) => m.SobreNosotros),
  },
  {
    path: 'contacto',
    loadComponent: () =>
      import('./features/publico/pages/contacto/contacto').then((m) => m.Contacto),
  },
  {
    path: 'terminos',
    loadComponent: () =>
      import('./features/publico/pages/terminos/terminos').then((m) => m.Terminos),
  },
  {
    path: 'privacidad',
    loadComponent: () =>
      import('./features/publico/pages/privacidad/privacidad').then((m) => m.Privacidad),
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
      {
        // Inventario (F8): todo el equipo consulta; cambiar exige el permiso GESTIONAR_INVENTARIO.
        path: 'inventario',
        canActivate: [rolGuard('SASTRE', 'SASTRE_ADMIN')],
        loadComponent: () =>
          import('./features/inventario/pages/inventario/inventario').then((m) => m.Inventario),
      },
      {
        // Gastos y resumen (F6): solo el SASTRE_ADMIN.
        path: 'gastos',
        canActivate: [rolGuard('SASTRE_ADMIN')],
        loadComponent: () => import('./features/gastos/pages/gastos/gastos').then((m) => m.Gastos),
      },
      {
        path: 'resumen',
        canActivate: [rolGuard('SASTRE_ADMIN')],
        loadComponent: () =>
          import('./features/resumen/pages/resumen/resumen').then((m) => m.Resumen),
      },
      { path: 'caja', redirectTo: 'resumen' },
      {
        // Informes (F9): solo el SASTRE_ADMIN.
        path: 'informes',
        canActivate: [rolGuard('SASTRE_ADMIN')],
        loadComponent: () =>
          import('./features/informes/pages/informes/informes').then((m) => m.Informes),
      },
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
      {
        // Registro de actividad de la sastrería (dueño 2026-10-22; solo admin, desde Ajustes).
        path: 'actividad',
        canActivate: [rolGuard('SASTRE_ADMIN')],
        loadComponent: () =>
          import('./features/actividad/pages/actividad/actividad').then((m) => m.Actividad),
      },
      {
        // Historial de notificaciones (dueño 2026-10-22): se abre desde "Ver historial" en la
        // campana; todo lo de los últimos 90 días, también lo quitado de la campana.
        path: 'notificaciones',
        canActivate: [autenticadoGuard],
        loadComponent: () =>
          import('./features/notificaciones/pages/historial/historial').then(
            (m) => m.HistorialNotificaciones,
          ),
      },
      // ── SuperAdmin (Manual §16): mismo marco, con sus propias secciones ──
      { path: 'super-admin', pathMatch: 'full', redirectTo: 'super-admin/sastrerias' },
      {
        path: 'super-admin/sastrerias',
        canActivate: [rolGuard('SUPER_ADMIN')],
        loadComponent: () =>
          import('./features/super-admin/pages/sastrerias/sastrerias').then(
            (m) => m.SuperAdminSastrerias,
          ),
      },
      {
        path: 'super-admin/duenos',
        canActivate: [rolGuard('SUPER_ADMIN')],
        loadComponent: () =>
          import('./features/super-admin/pages/duenos/duenos').then((m) => m.SuperAdminDuenos),
      },
      {
        path: 'super-admin/superadmins',
        canActivate: [rolGuard('SUPER_ADMIN')],
        loadComponent: () =>
          import('./features/super-admin/pages/superadmins/superadmins').then(
            (m) => m.SuperAdminSuperAdmins,
          ),
      },
      {
        path: 'super-admin/registro',
        canActivate: [rolGuard('SUPER_ADMIN')],
        loadComponent: () =>
          import('./features/super-admin/pages/registro/registro').then(
            (m) => m.SuperAdminRegistro,
          ),
      },
      {
        path: 'super-admin/configuracion',
        canActivate: [rolGuard('SUPER_ADMIN')],
        loadComponent: () =>
          import('./features/super-admin/pages/configuracion-sistema/configuracion-sistema').then(
            (m) => m.SuperAdminConfiguracion,
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'pedidos' },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
