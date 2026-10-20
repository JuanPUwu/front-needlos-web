import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Costura } from '../costura/costura';

/**
 * Indicador de carga (aguja cosiendo + texto) para lo que se está consultando: una lista,
 * un pedido… Ocupa un alto mínimo para que el contenido no "salte" al llegar.
 */
@Component({
  selector: 'app-cargando',
  imports: [Costura],
  template: `
    <div class="cargando" role="status" [class.cargando--compacto]="compacto()">
      <app-costura class="cargando__costura" />
      <span class="cargando__texto">{{ texto() }}</span>
    </div>
  `,
  styleUrl: './cargando.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cargando {
  readonly texto = input('Cargando...');
  /** Sin alto mínimo (dentro de una fila o un botón). */
  readonly compacto = input(false);
}
