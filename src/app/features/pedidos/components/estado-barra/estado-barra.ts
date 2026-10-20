import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icono, NombreIcono } from '../../../../shared/ui/icono/icono';
import { EstadoPedido } from '../../models/pedido.model';

/** Pestañas de estado ('' = todos). */
const PESTANAS: { valor: EstadoPedido | ''; etiqueta: string; icono: NombreIcono }[] = [
  { valor: 'EN_PROCESO', etiqueta: 'En proceso', icono: 'proceso' },
  { valor: 'FINALIZADO', etiqueta: 'Finalizado', icono: 'finalizado' },
  { valor: 'ENTREGADO', etiqueta: 'Entregado', icono: 'entregado' },
  { valor: 'ANULADO', etiqueta: 'Anulado', icono: 'anulado' },
  { valor: '', etiqueta: 'Todo', icono: 'todo' },
];

/**
 * Barra de estados de Pedidos: una cápsula por estado (con la cantidad de "En proceso" y
 * "Finalizado"). Solo presenta; avisa la pestaña elegida.
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
  readonly enProceso = input<number | null>(null);
  readonly finalizados = input<number | null>(null);

  readonly elegir = output<EstadoPedido | ''>();

  readonly pestanas = PESTANAS;

  /** Cantidad que muestra la pestaña (solo las que el resumen conoce y no son cero). */
  cantidadDe(valor: EstadoPedido | ''): number | null {
    return valor === 'EN_PROCESO'
      ? this.enProceso()
      : valor === 'FINALIZADO'
        ? this.finalizados()
        : null;
  }
}
