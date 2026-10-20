import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Calendario } from '../../../../shared/ui/calendario/calendario';

/**
 * Esqueleto de carga del detalle del pedido (Reglas §12.2): las mismas tarjetas y la misma
 * cuadrícula que el detalle (y el formulario), con piezas grises donde irán etiquetas,
 * campos, calendario, prendas, cobro y botones. Así el popup tiene su tamaño final desde
 * el inicio y nada salta cuando llegan los datos.
 */
@Component({
  selector: 'app-pedido-esqueleto',
  imports: [Calendario],
  templateUrl: './pedido-esqueleto.html',
  styleUrl: './pedido-esqueleto.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoEsqueleto {
  readonly tres = [0, 1, 2];
}
