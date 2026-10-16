import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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

  readonly esAdmin = computed(() => this.auth.roles().includes('SASTRE_ADMIN'));

  /** Secciones del negocio (términos del glosario: Pedidos, Equipo…). */
  readonly secciones: SeccionNav[] = [
    { etiqueta: 'Pedidos', ruta: '/pedidos', icono: 'pedidos' },
    { etiqueta: 'Inventario', ruta: '/inventario', icono: 'inventario' },
    { etiqueta: 'Gastos', ruta: '/gastos', icono: 'gastos' },
    { etiqueta: 'Caja', ruta: '/caja', icono: 'caja' },
    { etiqueta: 'Nómina', ruta: '/nomina', icono: 'nomina' },
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
