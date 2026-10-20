import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CantidadPipe } from '../../../../shared/pipes/cantidad.pipe';
import {
  ETIQUETA_ESTADO_STOCK,
  Material,
  estadoStock,
  etiquetaUnidad,
} from '../../models/material.model';

/**
 * Listado de materiales: tabla de anchos proporcionales (nunca se desplaza a lo ancho) que pasa a
 * tarjetas cuando el espacio no alcanza (Reglas §12.2). El color de cada fila dice su estado
 * (disponible, stock bajo, agotado o desactivado); cada fila abre el material.
 */
@Component({
  selector: 'app-materiales-tabla',
  imports: [CantidadPipe],
  templateUrl: './materiales-tabla.html',
  styleUrl: './materiales-tabla.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialesTabla {
  readonly materiales = input.required<Material[]>();
  readonly cargando = input(false);
  readonly abrir = output<Material>();

  readonly estado = estadoStock;
  readonly etiquetaEstado = ETIQUETA_ESTADO_STOCK;
  readonly etiquetaUnidad = etiquetaUnidad;
}
