import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import { Productividad } from '../../models/informe.model';

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
};

/**
 * Tarjeta "Productividad por sastre" (Manual §15): piezas que pasaron a finalizadas y a
 * entregadas en el periodo, contadas para el sastre asignado; las sin asignar, al final.
 */
@Component({
  selector: 'app-informe-productividad',
  imports: [TituloBloque],
  templateUrl: './informe-productividad.html',
  styleUrl: './informe-productividad.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformeProductividad {
  /** null mientras carga. */
  readonly datos = input<Productividad | null>(null);
  readonly error = input<string | null>(null);

  readonly vista = computed(() => this.datos() ?? (this.error() ? null : ESQUELETO));

  /** Iniciales para el avatar (o null para "sin asignar"). */
  iniciales(nombre: string | null): string | null {
    if (!nombre) {
      return null;
    }
    const partes = nombre.trim().split(/\s+/);
    return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
  }
}
