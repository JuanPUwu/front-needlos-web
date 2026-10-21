import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import { ModoInforme, Productividad } from '../../models/informe.model';
import { Vacio } from '../../../../shared/ui/vacio/vacio';
import { GraficoLineas } from '../../../../shared/ui/grafico-lineas/grafico-lineas';
import { etiquetaPunto, recortarHoras } from '../../models/serie-grafico';

/** Mientras carga: tres renglones de ejemplo (miden igual que los reales). */
const ESQUELETO: Productividad = {
  desde: '',
  hasta: '',
  sastres: [0, 1, 2].map((i) => ({
    sastreId: String(i),
    nombre: 'Nombre del sastre',
    finalizadas: 0,
    entregadas: 0,
  })),
  agrupacion: 'DIA',
  serie: [],
};

/**
 * Tarjeta "Productividad por sastre" (Manual §15): piezas que pasaron a finalizadas y a
 * entregadas en el periodo, contadas para el sastre asignado; las sin asignar, al final.
 */
@Component({
  selector: 'app-informe-productividad',
  imports: [Vacio, GraficoLineas, TituloBloque],
  templateUrl: './informe-productividad.html',
  styleUrl: './informe-productividad.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformeProductividad {
  /** null mientras carga. */
  readonly datos = input<Productividad | null>(null);
  readonly error = input<string | null>(null);
  /** Tablas (por defecto) o gráfico de líneas (dueño 2026-10-20). */
  readonly modo = input<ModoInforme>('tablas');

  readonly vista = computed(() => this.datos() ?? (this.error() ? null : ESQUELETO));

  /** Piezas finalizadas y entregadas por hora (un día) o por día (varios), de todo el equipo. */
  readonly grafico = computed(() => {
    const d = this.datos();
    if (!d) {
      return null;
    }
    const puntos = recortarHoras(
      d.serie,
      d.agrupacion,
      (p) => p.finalizadas !== 0 || p.entregadas !== 0,
    );
    return {
      porHora: d.agrupacion === 'HORA',
      vacio: d.serie.every((p) => p.finalizadas === 0 && p.entregadas === 0),
      etiquetas: puntos.map((p) => etiquetaPunto(p.clave, d.agrupacion)),
      series: [
        {
          nombre: 'Finalizadas',
          color: 'var(--estado-finalizado)',
          valores: puntos.map((p) => p.finalizadas),
          total: d.serie.reduce((suma, p) => suma + p.finalizadas, 0),
        },
        {
          nombre: 'Entregadas',
          color: 'var(--estado-entregado)',
          valores: puntos.map((p) => p.entregadas),
          total: d.serie.reduce((suma, p) => suma + p.entregadas, 0),
        },
      ],
    };
  });

  /** Iniciales para el avatar (o null para "sin asignar"). */
  iniciales(nombre: string | null): string | null {
    if (!nombre) {
      return null;
    }
    const partes = nombre.trim().split(/\s+/);
    return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
  }
}
