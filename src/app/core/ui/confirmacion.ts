import { Injectable, signal } from '@angular/core';

/** Qué tan serio es: define el símbolo y el color del popup. */
export type TipoAviso = 'advertencia' | 'peligro' | 'info';

/** Un estado con su color (los mismos de Pedidos: azul, verde, amarillo, rojo). */
export interface EstadoConColor {
  texto: string;
  tono: 'proceso' | 'finalizado' | 'entregado' | 'anulado';
}

export interface OpcionesConfirmacion {
  titulo: string;
  mensaje: string;
  /** Texto del botón que confirma (p. ej. "Sí, eliminar"). */
  aceptar: string;
  cancelar?: string;
  /** Acción destructiva o sin vuelta atrás: el botón va en rojo. */
  peligro?: boolean;
  /** Cambio de estado que se confirma: se ve "actual → nuevo" con sus colores. */
  cambio?: { desde: EstadoConColor; hacia: EstadoConColor };
}

export interface OpcionesAviso {
  titulo: string;
  mensaje: string;
  tipo?: TipoAviso;
  /** Texto del botón (por defecto "Aceptar"). */
  aceptar?: string;
}

interface Pendiente {
  titulo: string;
  mensaje: string;
  aceptar: string;
  cancelar: string;
  peligro: boolean;
  tipo: TipoAviso;
  cambio: { desde: EstadoConColor; hacia: EstadoConColor } | null;
  /** Aviso: un solo botón ("Aceptar"), sin cancelar. */
  soloAceptar: boolean;
  responder: (ok: boolean) => void;
}

/**
 * Popups en el centro de la pantalla (una sola instancia, `app-confirmacion`, en la raíz):
 * - `pedir`: confirmación antes de acciones críticas o sin vuelta atrás (Reglas §12.2):
 *   `if (await confirmacion.pedir({...})) { ... }`.
 * - `avisar`: mensaje que hay que aceptar ("Para crear el pedido falta…"), con el símbolo
 *   de advertencia, peligro o información según lo que es (dueño 2026-10-20). No es una
 *   notificación: no se va solo ni queda en la bandeja.
 */
@Injectable({ providedIn: 'root' })
export class Confirmacion {
  private readonly _actual = signal<Pendiente | null>(null);
  readonly actual = this._actual.asReadonly();

  pedir(opciones: OpcionesConfirmacion): Promise<boolean> {
    return this.abrir({
      titulo: opciones.titulo,
      mensaje: opciones.mensaje,
      aceptar: opciones.aceptar,
      cancelar: opciones.cancelar ?? 'Cancelar',
      peligro: !!opciones.peligro,
      tipo: opciones.peligro ? 'peligro' : 'advertencia',
      cambio: opciones.cambio ?? null,
      soloAceptar: false,
    });
  }

  async avisar(opciones: OpcionesAviso): Promise<void> {
    const tipo = opciones.tipo ?? 'advertencia';
    await this.abrir({
      titulo: opciones.titulo,
      mensaje: opciones.mensaje,
      aceptar: opciones.aceptar ?? 'Aceptar',
      cancelar: '',
      peligro: tipo === 'peligro',
      tipo,
      cambio: null,
      soloAceptar: true,
    });
  }

  responder(ok: boolean): void {
    this._actual()?.responder(ok);
  }

  private abrir(datos: Omit<Pendiente, 'responder'>): Promise<boolean> {
    // Si hubiera otro abierto, se da por cancelado.
    this._actual()?.responder(false);
    return new Promise((resolver) => {
      this._actual.set({
        ...datos,
        responder: (ok) => {
          this._actual.set(null);
          resolver(ok);
        },
      });
    });
  }
}
