import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type FormaEsqueleto = 'tabla' | 'lista' | 'campos' | 'bloque' | 'numero';

/**
 * Skeleton loader genérico (Reglas §12.2: "esperar información → skeleton"). Piezas grises
 * con un brillo, con la forma del contenido que va a llegar:
 * - `tabla`: encabezado + filas-tarjeta (listado de Pedidos).
 * - `lista`: filas separadas por línea con título, detalle y botón (Clientes, Equipo…).
 * - `campos`: etiquetas + campos de 46 px y el botón de guardar (formularios que cargan).
 * - `bloque`: un bloque del alto indicado (ticket, tarjetas sin forma fija).
 * - `numero`: la cifra de un contador; toma la letra de su contenedor (mide lo mismo).
 * `alto` es el alto de cada fila (o del bloque) para que mida como lo real.
 */
@Component({
  selector: 'app-esqueleto',
  templateUrl: './esqueleto.html',
  styleUrl: './esqueleto.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Esqueleto {
  readonly forma = input<FormaEsqueleto>('lista');
  readonly filas = input(5);
  readonly alto = input(72);
  /** Texto para lectores de pantalla. */
  readonly texto = input('Cargando...');

  readonly indices = computed(() => Array.from({ length: this.filas() }, (_, i) => i));
}
