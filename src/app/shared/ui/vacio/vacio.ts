import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icono, NombreIcono } from '../icono/icono';

/**
 * Lista sin nada que mostrar (dueño 2026-10-20): un ícono de lo que no se encuentra, un título
 * corto y una línea de ayuda, todo centrado en el espacio libre de su contenedor.
 */
@Component({
  selector: 'app-vacio',
  imports: [Icono],
  template: `
    <div class="vacio" role="status" [class.vacio--compacto]="compacto()">
      <span class="vacio__circulo" aria-hidden="true">
        <app-icono class="vacio__icono" [nombre]="icono()" />
      </span>
      <strong class="vacio__titulo">{{ titulo() }}</strong>
      @if (mensaje()) {
        <span class="vacio__mensaje">{{ mensaje() }}</span>
      }
    </div>
  `,
  styleUrl: './vacio.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Vacio {
  readonly icono = input.required<NombreIcono>();
  readonly titulo = input.required<string>();
  readonly mensaje = input<string | null>(null);
  /** Para tarjetas pequeñas (informes, bandeja, listas dentro de un popup). */
  readonly compacto = input(false);
}
