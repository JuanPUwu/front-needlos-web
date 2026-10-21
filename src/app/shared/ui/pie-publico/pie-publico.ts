import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Páginas públicas de NeedlOS (Manual §16.1, entrega H). */
export const PAGINAS_PUBLICAS = [
  { ruta: '/sobre-nosotros', etiqueta: 'Sobre nosotros' },
  { ruta: '/contacto', etiqueta: 'Contacto' },
  { ruta: '/terminos', etiqueta: 'Términos' },
  { ruta: '/privacidad', etiqueta: 'Privacidad' },
] as const;

/**
 * Pie de las pantallas públicas (login, registro y las páginas públicas): enlaces a Sobre
 * nosotros, Contacto, Términos y Privacidad. Va fuera de la tarjeta, para no cambiar su ritmo.
 */
@Component({
  selector: 'app-pie-publico',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <footer class="pp">
      <nav class="pp-enlaces" aria-label="Información de NeedlOS">
        @for (p of paginas; track p.ruta) {
          <a
            class="pp-enlace"
            [routerLink]="p.ruta"
            routerLinkActive="pp-enlace--activo"
            ariaCurrentWhenActive="page"
            >{{ p.etiqueta }}</a
          >
        }
      </nav>
      <p class="pp-marca">© {{ anio }} NeedlOS · Software para sastrerías</p>
    </footer>
  `,
  styleUrl: './pie-publico.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PiePublico {
  readonly paginas = PAGINAS_PUBLICAS;
  readonly anio = new Date().getFullYear();
}
