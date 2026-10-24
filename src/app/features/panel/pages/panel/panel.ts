import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { EstadoSastreria } from '../../../../core/auth/estado-sastreria';
import { Bandeja } from '../../../../core/notificaciones/bandeja';
import { Icono, NombreIcono } from '../../../../shared/ui/icono/icono';
import { Campana } from '../../../../shared/ui/campana/campana';
import { Logo } from '../../../../shared/ui/logo/logo';

/** Una sección de la barra lateral. */
interface SeccionNav {
  etiqueta: string;
  ruta: string;
  icono: NombreIcono;
  /** Solo visible para SASTRE_ADMIN. */
  soloAdmin?: boolean;
}

/**
 * Marco de la app autenticada: barra lateral con la navegación + área de
 * contenido (router-outlet). Cada sección es una ruta hija.
 */
@Component({
  selector: 'app-panel',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Logo, Icono, Campana],
  templateUrl: './panel.html',
  styleUrl: './panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Panel {
  private readonly auth = inject(AuthService);

  private readonly router = inject(Router);

  private readonly estadoSastreria = inject(EstadoSastreria);

  readonly esAdmin = computed(() => this.auth.roles().includes('SASTRE_ADMIN'));

  /**
   * La bandeja de notificaciones se crea aquí para toda la app. Su campana va en el encabezado de
   * cada sección (escritorio) y en la barra superior junto al menú (tablet/teléfono).
   */
  readonly bandejaActiva = inject(Bandeja).activa;

  /** Tarjeta de la barra lateral: la sastrería (o la plataforma, para el SuperAdmin) y quién soy. */
  readonly contexto = computed(() => this.auth.sesion()?.sastreria?.nombre ?? 'Panel de NeedlOS');
  readonly usuario = computed(() => {
    const c = this.auth.sesion()?.cuenta;
    return c ? `${c.nombre} ${c.apellido}` : '';
  });

  /** El SuperAdmin usa el mismo marco con sus propias secciones (Manual §16). */
  readonly esSuperAdmin = computed(() => this.auth.roles().includes('SUPER_ADMIN'));

  /** Un SuperAdmin dentro de la sastrería (solo lectura): en lugar de los avisos, "Salir". */
  readonly soporte = this.auth.soporte;

  /**
   * Aviso del plan (Manual §16): "Sin plan activo" (solo lectura) para todo el equipo cuando venció; al admin,
   * los días que faltan cuando quedan 7 o menos.
   */
  readonly avisoPlan = computed<{
    tono: 'peligro' | 'alerta';
    texto: string;
    detalle: string;
  } | null>(() => {
    const e = this.estadoSastreria.estado();
    if (!e) {
      return null;
    }
    if (e.soloLectura) {
      return {
        tono: 'peligro',
        texto: 'Sin plan activo',
        detalle: 'La licencia venció: puedes ver todo, pero no hacer cambios hasta renovarla.',
      };
    }
    if (e.porVencer && this.esAdmin() && e.diasRestantes !== null) {
      const que = e.plan === 'DEMO' ? 'La prueba' : 'La licencia';
      const cuando =
        e.diasRestantes === 0
          ? 'vence hoy'
          : `vence en ${e.diasRestantes} ${e.diasRestantes === 1 ? 'día' : 'días'}`;
      return {
        tono: 'alerta',
        texto: `${e.plan === 'DEMO' ? 'Prueba' : 'Licencia'}: ${cuando}`,
        detalle: `${que} ${cuando}. Después, la sastrería queda sin plan activo (solo se puede ver).`,
      };
    }
    return null;
  });

  /** Sub-pantallas a las que se entra desde Ajustes (el ítem Ajustes queda activo en ellas). */
  private readonly subAjustes: Record<string, string> = {
    '/sastreria': 'Mi sastrería',
    '/catalogo': 'Catálogo',
    '/actividad': 'Actividad',
    '/notificaciones': 'Notificaciones',
  };

  private readonly ruta = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );

  /** Dentro de una sub-pantalla de Ajustes: su nombre (para "Ajustes / Mi sastrería"). */
  readonly subAjuste = computed(() => this.subAjustes[this.ruta()] ?? null);
  /** Ajustes queda activo en su pantalla y en sus sub-pantallas. */
  readonly enAjustes = computed(() => this.ruta() === '/ajustes' || this.subAjuste() !== null);

  /** Secciones de la barra lateral según quién entra. */
  readonly secciones = computed(() =>
    this.esSuperAdmin() ? this.seccionesSuperAdmin : this.seccionesSastreria,
  );

  /** Secciones del SuperAdmin: la plataforma, no una sastrería. */
  private readonly seccionesSuperAdmin: SeccionNav[] = [
    { etiqueta: 'Sastrerías', ruta: '/super-admin/sastrerias', icono: 'tienda' },
    { etiqueta: 'Dueños', ruta: '/super-admin/duenos', icono: 'usuario' },
    { etiqueta: 'SuperAdmins', ruta: '/super-admin/superadmins', icono: 'equipo' },
    { etiqueta: 'Registro', ruta: '/super-admin/registro', icono: 'historial' },
    { etiqueta: 'Configuración', ruta: '/super-admin/configuracion', icono: 'filtros' },
  ];

  /** Secciones del negocio (términos del glosario: Pedidos, Equipo…). */
  private readonly seccionesSastreria: SeccionNav[] = [
    { etiqueta: 'Pedidos', ruta: '/pedidos', icono: 'pedidos' },
    { etiqueta: 'Clientes', ruta: '/clientes', icono: 'clientes' },
    { etiqueta: 'Inventario', ruta: '/inventario', icono: 'inventario' },
    { etiqueta: 'Gastos', ruta: '/gastos', icono: 'gastos', soloAdmin: true },
    { etiqueta: 'Resumen', ruta: '/resumen', icono: 'caja', soloAdmin: true },
    { etiqueta: 'Informes', ruta: '/informes', icono: 'informes', soloAdmin: true },
    { etiqueta: 'Equipo', ruta: '/equipo', icono: 'equipo', soloAdmin: true },
  ];

  /** Menú lateral desplegable en tablets/móvil (hamburguesa). */
  readonly menuAbierto = signal(false);

  esVisible(seccion: SeccionNav): boolean {
    return !seccion.soloAdmin || this.esAdmin();
  }

  salirDeSoporte(): void {
    this.cerrarMenu();
    this.auth.salirDeSoporte();
  }

  alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }
}
