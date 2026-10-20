import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Casilla de verificación con el estilo de la app (Reglas §12.2): cápsula de 44 px con un
 * cuadro redondeado que, marcado, se pinta azul marino con ✓ y resalta la cápsula. Se usa
 * en los filtros de los listados ("Para hoy", "Vencidos", "Con saldo"…).
 */
@Component({
  selector: 'app-casilla',
  template: `
    <label class="casilla" [class.casilla--marcada]="marcada()">
      <input
        #control
        class="casilla__control"
        type="checkbox"
        [checked]="marcada()"
        (change)="cambio.emit(control.checked)"
      />
      <span class="casilla__texto">{{ etiqueta() }}</span>
    </label>
  `,
  styleUrl: './casilla.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Casilla {
  readonly etiqueta = input.required<string>();
  readonly marcada = input(false);
  readonly cambio = output<boolean>();
}
