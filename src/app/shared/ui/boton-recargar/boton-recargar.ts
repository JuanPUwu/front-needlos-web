import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icono } from '../icono/icono';

/**
 * Botón de recargar de una sección (Manual §19.2): gris, cuadrado, de la altura de los
 * controles de búsqueda (44 px). Va junto al buscador de la sección (o al final de la fila de
 * periodos en Resumen e Informes). Mientras recarga, el ícono gira y no se puede volver a tocar.
 */
@Component({
  selector: 'app-boton-recargar',
  imports: [Icono],
  template: `
    <button
      class="br"
      type="button"
      [class.br--girando]="recargando()"
      [disabled]="recargando()"
      [attr.aria-label]="recargando() ? 'Recargando…' : 'Recargar'"
      [title]="recargando() ? 'Recargando…' : 'Recargar'"
      (click)="recargar.emit()"
    >
      <app-icono class="br__icono" nombre="recargar" />
    </button>
  `,
  styleUrl: './boton-recargar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BotonRecargar {
  readonly recargando = input(false);
  readonly recargar = output<void>();
}
