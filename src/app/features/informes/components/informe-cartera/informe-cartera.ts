import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Params } from '@angular/router';
import { FechaPipe } from '../../../../shared/pipes/fecha.pipe';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import { Cartera, ETIQUETA_ENTREGA } from '../../models/informe.model';

const FILA = { id: '', numero: '#0-0', cliente: 'Cliente de ejemplo', fechaEntrega: '2026-01-01' };

/** Mientras carga: la misma estructura en $0 con renglones de ejemplo (mide igual). */
const ESQUELETO: Cartera = {
  hoy: '',
  totalAdeudado: 0,
  pedidosConSaldo: 0,
  mayoresSaldos: [0, 1].map(() => ({ ...FILA, total: 0, saldo: 0 })),
  vencidos: 0,
  paraHoy: 0,
  proximos: 0,
  porEntregar: [0, 1].map(() => ({ ...FILA, categoria: 'HOY' as const, piezasPendientes: 0 })),
};

/**
 * Tarjeta "Cartera y entregas" (Manual §15, foto de hoy): lo que se debe y los pedidos con más
 * saldo; los vencidos, los de hoy y los de los próximos 3 días. Cada pedido abre su detalle y
 * "Ver en Pedidos" lleva al listado con el filtro puesto.
 */
@Component({
  selector: 'app-informe-cartera',
  imports: [TituloBloque, MonedaPipe, FechaPipe],
  templateUrl: './informe-cartera.html',
  styleUrl: './informe-cartera.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformeCartera {
  /** null mientras carga. */
  readonly datos = input<Cartera | null>(null);
  readonly error = input<string | null>(null);
  readonly abrirPedido = output<string>();
  readonly verPedidos = output<Params>();

  readonly etiquetaEntrega = ETIQUETA_ENTREGA;
  readonly vista = computed(() => this.datos() ?? (this.error() ? null : ESQUELETO));

  verConSaldo(): void {
    this.verPedidos.emit({ conSaldo: 'true', estado: '' });
  }

  verVencidos(): void {
    this.verPedidos.emit({ vencidos: 'true', estado: '' });
  }
}
