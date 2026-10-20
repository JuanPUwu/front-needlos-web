import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { Icono } from '../../../../shared/ui/icono/icono';

/**
 * Tarjeta de una prenda en la lista del formulario de crear/editar pedido. Mismo diseño
 * que la tarjeta de prenda del detalle (`app-prenda-tarjeta`): borde izquierdo de color,
 * "1 × Camisa" | total, vlr. unit., descripción y, bajo una línea, Editar · Eliminar.
 */
@Component({
  selector: 'app-prenda-linea',
  imports: [Icono, MonedaPipe],
  templateUrl: './prenda-linea.html',
  styleUrl: './prenda-linea.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrendaLinea {
  readonly numero = input.required<number>();
  readonly cantidad = input.required<number>();
  readonly producto = input.required<string>();
  readonly descripcion = input.required<string>();
  readonly precio = input.required<number>();
  /** Se está corrigiendo en la línea de captura. */
  readonly editando = input(false);
  /** Ya se entregó (en edición): no se puede editar ni quitar. */
  readonly entregada = input(false);

  readonly editar = output<void>();
  readonly quitar = output<void>();
}
