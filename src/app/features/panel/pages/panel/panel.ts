import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { Icono, NombreIcono } from '../../../../shared/ui/icono/icono';
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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Logo, Icono],
  templateUrl: './panel.html',
  styleUrl: './panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Panel {
  private readonly auth = inject(AuthService);

  private readonly router = inject(Router);

  readonly esAdmin = computed(() => this.auth.roles().includes('SASTRE_ADMIN'));

  /** Sub-pantallas a las que se entra desde Ajustes (el ítem Ajustes queda activo en ellas). */
  private readonly subAjustes: Record<string, string> = {
    '/sastreria': 'Mi sastrería',
    '/mi-cuenta': 'Mi cuenta',
    '/catalogo': 'Catálogo',
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

  /** Secciones del negocio (términos del glosario: Pedidos, Equipo…). */
  readonly secciones: SeccionNav[] = [
    { etiqueta: 'Pedidos', ruta: '/pedidos', icono: 'pedidos' },
    { etiqueta: 'Clientes', ruta: '/clientes', icono: 'clientes' },
    { etiqueta: 'Inventario', ruta: '/inventario', icono: 'inventario' },
    { etiqueta: 'Gastos', ruta: '/gastos', icono: 'gastos', soloAdmin: true },
    { etiqueta: 'Resumen', ruta: '/resumen', icono: 'caja', soloAdmin: true },
    { etiqueta: 'Informes', ruta: '/informes', icono: 'informes' },
    { etiqueta: 'Equipo', ruta: '/equipo', icono: 'equipo', soloAdmin: true },
  ];

  /** Menú lateral desplegable en tablets/móvil (hamburguesa). */
  readonly menuAbierto = signal(false);

  esVisible(seccion: SeccionNav): boolean {
    return !seccion.soloAdmin || this.esAdmin();
  }

  alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }
}
