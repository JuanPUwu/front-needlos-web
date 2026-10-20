import { Injectable, signal } from '@angular/core';

export type TipoNotificacion = 'exito' | 'error' | 'info';

export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  mensaje: string;
}

/** Cuánto se ve una notificación (los errores, un poco más). */
const DURACION_MS: Record<TipoNotificacion, number> = { exito: 4000, info: 4000, error: 6000 };
const MAXIMO_VISIBLES = 4;

/**
 * Notificaciones temporales (Reglas §12.2): "Invitación enviada", "Pedido creado"… Se
 * muestran apiladas en una esquina y se van solas. Los errores de un formulario NO van
 * aquí: se muestran junto al campo o en el formulario.
 */
@Injectable({ providedIn: 'root' })
export class Notificaciones {
  private siguienteId = 1;
  private readonly _lista = signal<Notificacion[]>([]);
  readonly lista = this._lista.asReadonly();

  /**
   * Lo que se muestra también queda en la bandeja (Manual §19). La bandeja se registra aquí al
   * iniciar (así no hay dependencia circular entre los dos servicios).
   */
  alMostrar: ((tipo: TipoNotificacion, mensaje: string) => void) | null = null;

  exito(mensaje: string): void {
    this.mostrar('exito', mensaje);
  }

  error(mensaje: string): void {
    this.mostrar('error', mensaje);
  }

  info(mensaje: string): void {
    this.mostrar('info', mensaje);
  }

  /** Muestra un aviso que YA está en la bandeja (llegó del servidor): no se vuelve a guardar. */
  mostrarSinGuardar(tipo: TipoNotificacion, mensaje: string): void {
    this.mostrar(tipo, mensaje, false);
  }

  cerrar(id: number): void {
    this._lista.update((l) => l.filter((n) => n.id !== id));
  }

  private mostrar(tipo: TipoNotificacion, mensaje: string, guardar = true): void {
    if (guardar) {
      this.alMostrar?.(tipo, mensaje);
    }
    const id = this.siguienteId++;
    this._lista.update((l) => [...l, { id, tipo, mensaje }].slice(-MAXIMO_VISIBLES));
    setTimeout(() => this.cerrar(id), DURACION_MS[tipo]);
  }
}
