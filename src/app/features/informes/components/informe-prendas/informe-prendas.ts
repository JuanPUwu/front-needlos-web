import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Params } from '@angular/router';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import { ClienteFrecuente, PrendasClientes } from '../../models/informe.model';

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
  imports: [TituloBloque, MonedaPipe],
  templateUrl: './informe-prendas.html',
  styleUrl: './informe-prendas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformePrendas {
  /** null mientras carga. */
  readonly datos = input<PrendasClientes | null>(null);
  readonly error = input<string | null>(null);
  readonly verPedidos = output<Params>();

  readonly vista = computed(() => this.datos() ?? (this.error() ? null : ESQUELETO));

  verCliente(c: ClienteFrecuente): void {
    this.verPedidos.emit({ clienteId: c.clienteId, cliente: c.nombre, estado: '' });
  }
}
