import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FechaPipe } from '../../../../shared/pipes/fecha.pipe';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { Icono } from '../../../../shared/ui/icono/icono';
import { etiquetaMetodo } from '../../../pedidos/models/pedido.model';
import { Gasto } from '../../models/gasto.model';

/**
 * Listado de gastos: tabla de anchos proporcionales (nunca se desplaza a lo ancho) que pasa a
 * tarjetas cuando el espacio no alcanza (Reglas §12.2). Cada fila abre la corrección del gasto.
 */
@Component({
  selector: 'app-gastos-tabla',
  imports: [Icono, MonedaPipe, FechaPipe],
  templateUrl: './gastos-tabla.html',
  styleUrl: './gastos-tabla.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GastosTabla {
  readonly gastos = input.required<Gasto[]>();
  readonly cargando = input(false);
  readonly editar = output<Gasto>();
  readonly eliminar = output<Gasto>();

  readonly etiquetaMetodo = etiquetaMetodo;
}
