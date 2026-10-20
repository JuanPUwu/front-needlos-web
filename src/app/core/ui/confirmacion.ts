import { Injectable, signal } from '@angular/core';

export interface OpcionesConfirmacion {
  titulo: string;
  mensaje: string;
  /** Texto del botón que confirma (p. ej. "Sí, eliminar"). */
  aceptar: string;
  cancelar?: string;
  /** Acción destructiva o sin vuelta atrás: el botón va en rojo. */
  peligro?: boolean;
}

interface Pendiente extends OpcionesConfirmacion {
  responder: (ok: boolean) => void;
}

/**
 * Confirmación antes de acciones críticas o sin vuelta atrás (Reglas §12.2): eliminar,
 * desactivar, entregar, cancelar una invitación, limpiar un formulario… Uso:
 * `if (await confirmacion.pedir({...})) { ... }`. Se muestra en un popup propio
 * (`app-confirmacion`, en la raíz de la app).
 */
@Injectable({ providedIn: 'root' })
export class Confirmacion {
  private readonly _actual = signal<Pendiente | null>(null);
  readonly actual = this._actual.asReadonly();

  pedir(opciones: OpcionesConfirmacion): Promise<boolean> {
    // Si hubiera otra abierta, se da por cancelada.
    this._actual()?.responder(false);
    return new Promise((resolver) => {
      this._actual.set({
        ...opciones,
        responder: (ok) => {
          this._actual.set(null);
          resolver(ok);
        },
      });
    });
  }

  responder(ok: boolean): void {
    this._actual()?.responder(ok);
  }
}
