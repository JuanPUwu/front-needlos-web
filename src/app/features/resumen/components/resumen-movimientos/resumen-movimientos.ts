import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { FechaPipe } from '../../../../shared/pipes/fecha.pipe';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto';
import { Icono } from '../../../../shared/ui/icono/icono';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import { METODOS_PAGO, etiquetaMetodo } from '../../../pedidos/models/pedido.model';
import {
  ETIQUETA_MOVIMIENTO,
  FiltrosMovimientos,
  Movimiento,
  ORDENES_MOVIMIENTOS,
  OrdenMovimientos,
  TipoMovimiento,
} from '../../models/resumen.model';

/**
 * Movimientos del resumen (abonos, devoluciones y gastos), presentacional: la página los pide
 * paginados y filtrados al backend. Filtros por tipo, método y orden; tabla de anchos
 * proporcionales que pasa a tarjetas cuando no cabe; cada fila abre su pedido o su gasto.
 */
@Component({
  selector: 'app-resumen-movimientos',
  imports: [TituloBloque, MonedaPipe, FechaPipe, FechaHoraPipe, Esqueleto, Icono],
  templateUrl: './resumen-movimientos.html',
  styleUrl: './resumen-movimientos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumenMovimientos {
  readonly movimientos = input.required<Movimiento[]>();
  readonly filtros = input.required<FiltrosMovimientos>();
  readonly total = input(0);
  readonly pagina = input(0);
  readonly totalPaginas = input(0);
  readonly cargando = input(false);
  readonly error = input<string | null>(null);
  /** Periodo de varios días: se muestra la fecha además de la hora. */
  readonly varios = input(false);

  readonly filtrar = output<Partial<FiltrosMovimientos>>();
  readonly limpiar = output<void>();
  readonly irAPagina = output<number>();
  readonly abrir = output<Movimiento>();

  readonly metodos = METODOS_PAGO;
  readonly ordenes = ORDENES_MOVIMIENTOS;
  readonly etiquetaMetodo = etiquetaMetodo;
  readonly etiquetaTipo = ETIQUETA_MOVIMIENTO;
  readonly tipos: { valor: TipoMovimiento | ''; etiqueta: string }[] = [
    { valor: '', etiqueta: 'Todo tipo' },
    { valor: 'ABONO', etiqueta: 'Abonos' },
    { valor: 'DEVOLUCION', etiqueta: 'Devoluciones' },
    { valor: 'GASTO', etiqueta: 'Gastos' },
  ];

  /** Hay filtros que limpiar (el orden no cuenta). */
  readonly hayFiltros = computed(() => !!this.filtros().tipo || !!this.filtros().metodo);

  elegirTipo(tipo: string): void {
    this.filtrar.emit({ tipo: tipo as TipoMovimiento | '' });
  }

  elegirMetodo(metodo: string): void {
    this.filtrar.emit({ metodo });
  }

  elegirOrden(orden: string): void {
    this.filtrar.emit({ orden: orden as OrdenMovimientos });
  }

  /** Ingreso (abono) suma; devolución y gasto restan. */
  esIngreso(m: Movimiento): boolean {
    return m.tipo === 'ABONO';
  }

  etiquetaAbrir(m: Movimiento): string {
    return m.tipo === 'GASTO' ? `Corregir gasto ${m.razon}` : `Abrir pedido ${m.pedidoNumero}`;
  }
}
