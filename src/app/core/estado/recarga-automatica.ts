import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject } from '@angular/core';

/** Recarga periódica de las listas clave (Pedidos, Resumen) mientras se miran. */
export const INTERVALO_LISTAS_MS = 90_000;

/** Al volver a la pestaña/app se recarga si estuvo fuera al menos este tiempo. */
export const AUSENCIA_MINIMA_MS = 30_000;

export interface OpcionesRecarga {
  /** Recarga periódica mientras la pestaña está visible (solo listas clave, p. ej. Pedidos). */
  cadaMs?: number;
  /**
   * Si en este momento se puede recargar sin molestar (p. ej. no hay un popup abierto ni algo
   * escrito sin guardar). Por defecto, siempre.
   */
  puede?: () => boolean;
}

/**
 * Mantiene al día los datos de una sección sin tiempo real (Manual §19.2): recarga al volver a
 * la pestaña o a la app después de un rato fuera y, si se pide, cada cierto tiempo mientras se
 * mira. Debe llamarse en el contexto de inyección (constructor o campo) de la sección; se detiene
 * sola al salir de ella. `recargar` debe ser silenciosa: conservar lo que se ve mientras llega lo
 * nuevo.
 */
export function recargaAutomatica(recargar: () => void, opciones: OpcionesRecarga = {}): void {
  const documento = inject(DOCUMENT);
  const ventana = documento.defaultView;
  const puede = opciones.puede ?? (() => true);
  let ocultaDesde: number | null = documento.visibilityState === 'hidden' ? Date.now() : null;

  const alCambiarVisibilidad = (): void => {
    if (documento.visibilityState === 'hidden') {
      ocultaDesde = Date.now();
      return;
    }
    const fuera = ocultaDesde === null ? 0 : Date.now() - ocultaDesde;
    ocultaDesde = null;
    if (fuera >= AUSENCIA_MINIMA_MS && puede()) {
      recargar();
    }
  };
  documento.addEventListener('visibilitychange', alCambiarVisibilidad);

  const temporizador =
    opciones.cadaMs && ventana
      ? ventana.setInterval(() => {
          if (documento.visibilityState === 'visible' && puede()) {
            recargar();
          }
        }, opciones.cadaMs)
      : null;

  inject(DestroyRef).onDestroy(() => {
    documento.removeEventListener('visibilitychange', alCambiarVisibilidad);
    if (temporizador !== null) {
      ventana?.clearInterval(temporizador);
    }
  });
}
