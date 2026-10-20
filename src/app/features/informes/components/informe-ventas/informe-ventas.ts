import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FechaPipe } from '../../../../shared/pipes/fecha.pipe';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import { etiquetaMetodo } from '../../../pedidos/models/pedido.model';
import { Ventas } from '../../models/informe.model';

/** Mientras carga: la misma estructura en $0 con tres renglones de ejemplo (mide igual). */
const ESQUELETO: Ventas = {
  desde: '',
  hasta: '',
  pedidos: 0,
  ventas: 0,
  ticketPromedio: 0,
  ingresos: 0,
  porMetodo: (['EFECTIVO', 'NEQUI', 'TARJETA'] as const).map((metodo) => ({
    metodo,
    ingresos: 0,
    devoluciones: 0,
    neto: 0,
  })),
  porDia: [],
};

/**
 * Tarjeta "Ventas e ingresos" (Manual §15): ventas por fecha de recibido (sin anulados), ticket
 * promedio e ingresos (abonos − devoluciones) por método; en periodos de varios días, por día.
 */
@Component({
  selector: 'app-informe-ventas',
  imports: [TituloBloque, MonedaPipe, FechaPipe],
  templateUrl: './informe-ventas.html',
  styleUrl: './informe-ventas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformeVentas {
  /** null mientras carga. */
  readonly datos = input<Ventas | null>(null);
  readonly error = input<string | null>(null);

  readonly etiquetaMetodo = etiquetaMetodo;
  readonly vista = computed(() => this.datos() ?? (this.error() ? null : ESQUELETO));
  readonly varios = computed(() => {
    const d = this.datos();
    return !!d && d.desde !== d.hasta;
  });
}
