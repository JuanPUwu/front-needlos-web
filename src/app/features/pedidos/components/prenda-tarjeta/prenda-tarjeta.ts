import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { Icono } from '../../../../shared/ui/icono/icono';
import { MiembroAsignable } from '../../../equipo/models/empleado.model';
import { ETIQUETA_ESTADO_PRENDA, Prenda } from '../../models/pedido.model';

/**
 * Tarjeta de una prenda en el detalle del pedido (diseño del dueño, 2026-10-18): mismo
 * estilo que las tarjetas del listado de Pedidos (borde izquierdo del color del estado).
 * Arriba "1 × Camisa" | total; debajo "● estado" | vlr. unit.; la descripción y, bajo una
 * línea, el sastre | Historial y la acción de estado. Las acciones las ejecuta el detalle.
 */
@Component({
  selector: 'app-prenda-tarjeta',
  imports: [Icono, MonedaPipe, FechaHoraPipe],
  templateUrl: './prenda-tarjeta.html',
  styleUrl: './prenda-tarjeta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrendaTarjeta {
  readonly prenda = input.required<Prenda>();
  readonly anulado = input(false);
  readonly ocupado = input(false);
  readonly puedeCambiarEstado = input(false);
  readonly puedeEntregar = input(false);
  readonly puedeAsignar = input(false);
  readonly sastres = input<MiembroAsignable[]>([]);

  readonly finalizar = output<void>();
  readonly volverAProceso = output<void>();
  readonly entregar = output<void>();
  readonly asignar = output<string>();

  readonly etiqueta = ETIQUETA_ESTADO_PRENDA;
  readonly historialAbierto = signal(false);
}
