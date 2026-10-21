import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Params } from '@angular/router';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import { ClienteFrecuente, ModoInforme, PrendasClientes } from '../../models/informe.model';
import { Vacio } from '../../../../shared/ui/vacio/vacio';
import { BarraGrafico, GraficoBarras } from '../../../../shared/ui/grafico-barras/grafico-barras';

/** Mientras carga: renglones de ejemplo (miden igual que los reales). */
const ESQUELETO: PrendasClientes = {
  desde: '',
  hasta: '',
  prendas: [0, 1, 2].map(() => ({ tipo: 'Tipo de prenda', piezas: 0, valor: 0 })),
  clientes: [0, 1, 2].map((i) => ({
    clienteId: String(i),
    nombre: 'Nombre del cliente',
    pedidos: 0,
    valor: 0,
  })),
};

/**
 * Tarjeta "Prendas y clientes" (Manual §15): los tipos de prenda más pedidos (en piezas) y los
 * clientes que más compraron en el periodo; un cliente lleva a sus pedidos.
 */
@Component({
  selector: 'app-informe-prendas',
  imports: [Vacio, GraficoBarras, TituloBloque, MonedaPipe],
  templateUrl: './informe-prendas.html',
  styleUrl: './informe-prendas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformePrendas {
  /** null mientras carga. */
  readonly datos = input<PrendasClientes | null>(null);
  readonly error = input<string | null>(null);
  readonly verPedidos = output<Params>();
  /** Tablas (por defecto) o barras (dueño 2026-10-20). */
  readonly modo = input<ModoInforme>('tablas');

  readonly vista = computed(() => this.datos() ?? (this.error() ? null : ESQUELETO));

  private readonly moneda = new MonedaPipe();

  /** Barras: prendas por piezas (con su valor) y clientes por valor (con sus pedidos). */
  readonly barras = computed(() => {
    const v = this.vista();
    if (!v) {
      return null;
    }
    return {
      prendas: v.prendas.map((p, i): BarraGrafico => ({
        id: String(i),
        etiqueta: p.tipo,
        valor: p.piezas,
        detalle: this.moneda.transform(p.valor),
      })),
      clientes: v.clientes.map((c): BarraGrafico => ({
        id: c.clienteId,
        etiqueta: c.nombre,
        valor: c.valor,
        detalle: `${c.pedidos} ${c.pedidos === 1 ? 'pedido' : 'pedidos'}`,
      })),
    };
  });

  /** Tocar la barra de un cliente lleva a sus pedidos. */
  verClienteBarra(barra: BarraGrafico): void {
    this.verPedidos.emit({ clienteId: barra.id, cliente: barra.etiqueta, estado: '' });
  }

  verCliente(c: ClienteFrecuente): void {
    this.verPedidos.emit({ clienteId: c.clienteId, cliente: c.nombre, estado: '' });
  }
}
