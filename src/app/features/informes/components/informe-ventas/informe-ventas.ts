import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FechaPipe } from '../../../../shared/pipes/fecha.pipe';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import { etiquetaMetodo } from '../../../pedidos/models/pedido.model';
import { ModoInforme, Ventas } from '../../models/informe.model';
import { Vacio } from '../../../../shared/ui/vacio/vacio';
import { GraficoLineas } from '../../../../shared/ui/grafico-lineas/grafico-lineas';
import { etiquetaPunto, recortarHoras } from '../../models/serie-grafico';

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
  agrupacion: 'DIA',
  serie: [],
};

/**
 * Tarjeta "Ventas e ingresos" (Manual §15): ventas por fecha de recibido (sin anulados), ticket
 * promedio e ingresos (abonos − devoluciones) por método; en periodos de varios días, por día.
 */
@Component({
  selector: 'app-informe-ventas',
  imports: [Vacio, GraficoLineas, TituloBloque, MonedaPipe, FechaPipe],
  templateUrl: './informe-ventas.html',
  styleUrl: './informe-ventas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformeVentas {
  /** null mientras carga. */
  readonly datos = input<Ventas | null>(null);
  readonly error = input<string | null>(null);
  /** Tablas (por defecto) o gráfico de líneas (dueño 2026-10-20). */
  readonly modo = input<ModoInforme>('tablas');

  readonly etiquetaMetodo = etiquetaMetodo;
  readonly vista = computed(() => this.datos() ?? (this.error() ? null : ESQUELETO));
  /** Ventas e ingresos por hora (un día) o por día (varios), para el gráfico. */
  readonly grafico = computed(() => {
    const d = this.datos();
    if (!d) {
      return null;
    }
    const puntos = recortarHoras(d.serie, d.agrupacion, (p) => p.ventas !== 0 || p.ingresos !== 0);
    return {
      porHora: d.agrupacion === 'HORA',
      vacio: d.serie.every((p) => p.ventas === 0 && p.ingresos === 0),
      etiquetas: puntos.map((p) => etiquetaPunto(p.clave, d.agrupacion)),
      series: [
        {
          nombre: 'Ventas',
          color: 'var(--color-accent)',
          valores: puntos.map((p) => p.ventas),
          total: d.ventas,
        },
        {
          nombre: 'Ingresos',
          color: 'var(--color-success)',
          valores: puntos.map((p) => p.ingresos),
          total: d.ingresos,
        },
      ],
    };
  });

  readonly varios = computed(() => {
    const d = this.datos();
    return !!d && d.desde !== d.hasta;
  });
}
