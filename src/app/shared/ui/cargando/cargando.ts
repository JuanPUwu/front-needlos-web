import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Indicador de carga (círculo girando + texto) para lo que se está consultando: una lista,
 * un pedido… Ocupa un alto mínimo para que el contenido no "salte" al llegar.
 */
@Component({
  selector: 'app-cargando',
  template: `
    <div class="cargando" role="status" [class.cargando--compacto]="compacto()">
      <span class="cargando__circulo" aria-hidden="true"></span>
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
