import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MonedaPipe } from '../../pipes/moneda.pipe';
import { FormatoGrafico } from '../grafico-lineas/grafico-lineas';

/** Una barra: su nombre, el valor que la mide y un detalle opcional ("3 pedidos"). */
export interface BarraGrafico {
  id: string;
  etiqueta: string;
  valor: number;
  detalle?: string;
}

const MONEDA = new MonedaPipe();
const NUMERO = new Intl.NumberFormat('es-CO');

/**
 * Barras horizontales (los que más, en los informes; dueño 2026-10-20): cada fila con su nombre,
 * la barra proporcional al mayor y su valor. Con `interactivo`, cada fila es un botón.
 */
@Component({
  selector: 'app-grafico-barras',
  imports: [NgTemplateOutlet],
  templateUrl: './grafico-barras.html',
  styleUrl: './grafico-barras.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficoBarras {
  readonly barras = input.required<BarraGrafico[]>();
  readonly formato = input<FormatoGrafico>('numero');
  /** Unidad tras el número ("pzs"); solo para el formato número. */
  readonly unidad = input('');
  /** Color de las barras (token CSS). */
  readonly color = input('var(--color-accent)');
  readonly interactivo = input(false);
  /** Texto del botón de cada fila para lectores de pantalla ("Ver los pedidos de"). */
  readonly accion = input('');
  readonly cargando = input(false);
  readonly elegir = output<BarraGrafico>();

  readonly filas = computed(() => {
    const max = Math.max(1, ...this.barras().map((b) => b.valor));
    return this.barras().map((b) => ({
      ...b,
      ancho: Math.max(2, (b.valor / max) * 100),
      texto:
        this.formato() === 'moneda'
          ? MONEDA.transform(b.valor)
          : `${NUMERO.format(b.valor)}${this.unidad() ? ' ' + this.unidad() : ''}`,
    }));
  });
}
