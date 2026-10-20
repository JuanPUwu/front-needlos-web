import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { FechaPipe } from '../../../../shared/pipes/fecha.pipe';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { ETIQUETA_ESTADO, PedidoResumen } from '../../models/pedido.model';

/**
 * Listado de pedidos (Reglas §12.2). En espacios anchos es una tabla de anchos fijos que
 * NUNCA se desplaza a lo ancho (lo que no cabe termina en "…"); cuando el espacio no
 * alcanza, pasa directamente a tarjetas: borde del color del estado, cliente y valor
 * arriba, número · estado y saldo, prendas y, bajo una línea, entrega y radicado.
 */
@Component({
  selector: 'app-pedidos-tabla',
  imports: [FechaPipe, FechaHoraPipe, MonedaPipe],
  templateUrl: './pedidos-tabla.html',
  styleUrl: './pedidos-tabla.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidosTabla {
  readonly pedidos = input.required<PedidoResumen[]>();
  /** Atenúa la lista mientras llega la página siguiente. */
  readonly cargando = input(false);
  readonly abrir = output<PedidoResumen>();

  readonly etiquetaEstado = ETIQUETA_ESTADO;
}
