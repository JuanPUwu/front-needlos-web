import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icono, NombreIcono } from '../../../../shared/ui/icono/icono';
import { EstadoPedido, ResumenPedidos } from '../../models/pedido.model';

/** Pestañas de estado ('' = todos). */
const PESTANAS: { valor: EstadoPedido | ''; etiqueta: string; icono: NombreIcono }[] = [
  { valor: 'EN_PROCESO', etiqueta: 'En proceso', icono: 'proceso' },
  { valor: 'FINALIZADO', etiqueta: 'Finalizado', icono: 'finalizado' },
  { valor: 'ENTREGADO', etiqueta: 'Entregado', icono: 'entregado' },
  { valor: 'ANULADO', etiqueta: 'Anulado', icono: 'anulado' },
  { valor: '', etiqueta: 'Todo', icono: 'todo' },
];

/**
 * Barra de estados de Pedidos: una cápsula por estado con su cantidad (en el color de su
 * estado; "Todo" en navy). Solo presenta; avisa la pestaña elegida.
 */
@Component({
  selector: 'app-estado-barra',
  imports: [Icono],
  templateUrl: './estado-barra.html',
  styleUrl: './estado-barra.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstadoBarra {
  readonly estado = input.required<EstadoPedido | ''>();
  /** Contadores del resumen (null mientras carga: sin cantidades). */
  readonly conteos = input<ResumenPedidos | null>(null);

  readonly elegir = output<EstadoPedido | ''>();

  readonly pestanas = PESTANAS;

  /** Cantidad que muestra la pestaña (cero no se muestra). */
  cantidadDe(valor: EstadoPedido | ''): number | null {
    const c = this.conteos();
    if (!c) {
      return null;
    }
    switch (valor) {
      case 'EN_PROCESO':
        return c.enProceso;
      case 'FINALIZADO':
        return c.listosParaEntregar;
      case 'ENTREGADO':
        return c.entregados;
      case 'ANULADO':
        return c.anulados;
      default:
        return c.total;
    }
  }
}
