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
/** Pausa entre dos avisos seguidos en la barra: se ve recogerse y volver a salir. */
const PAUSA_CINTA_MS = 250;

/**
 * Notificaciones temporales (Reglas §12.2): "Invitación enviada", "Pedido creado"… Se van solas.
 * Si hay una campana a la vista, salen como una **barra que se despliega a la izquierda de la
 * campana** (dueño 2026-10-23), de a una (las demás esperan su turno); si no (pantallas de acceso o
 * con un popup abierto encima), apiladas en la esquina. Los errores de un formulario NO van aquí:
 * se muestran junto al campo o en el formulario.
 */
@Injectable({ providedIn: 'root' })
export class Notificaciones {
  private siguienteId = 1;
  private readonly _lista = signal<Notificacion[]>([]);
  readonly lista = this._lista.asReadonly();

  /** La que se ve ahora en la barra de la campana (null = recogida). */
  private readonly _cinta = signal<Notificacion | null>(null);
  readonly cinta = this._cinta.asReadonly();
  private cola: Notificacion[] = [];
  /** Campanas montadas (la del encabezado y la de la barra superior; CSS muestra una). */
  private campanas = 0;

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

  /** Una campana se monta; devuelve con qué avisar cuando se desmonta. */
  registrarCampana(): () => void {
    this.campanas++;
    return () => {
      this.campanas--;
    };
  }

  /** Recoge la barra ahora (tocarla) y pasa al siguiente aviso, si hay. */
  cerrarCinta(): void {
    const actual = this._cinta();
    if (actual) {
      this.siguienteCinta(actual.id);
    }
  }

  private mostrar(tipo: TipoNotificacion, mensaje: string, guardar = true): void {
    if (guardar) {
      this.alMostrar?.(tipo, mensaje);
    }
    const n: Notificacion = { id: this.siguienteId++, tipo, mensaje };
    if (this.campanas > 0 && !hayPopupAbierto()) {
      this.encolarCinta(n);
      return;
    }
    this._lista.update((l) => [...l, n].slice(-MAXIMO_VISIBLES));
    setTimeout(() => this.cerrar(n.id), DURACION_MS[tipo]);
  }

  private encolarCinta(n: Notificacion): void {
    if (this._cinta()) {
      this.cola = [...this.cola, n].slice(-MAXIMO_VISIBLES);
      return;
    }
    this.mostrarCinta(n);
  }

  private mostrarCinta(n: Notificacion): void {
    this._cinta.set(n);
    setTimeout(() => this.siguienteCinta(n.id), DURACION_MS[n.tipo]);
  }

  private siguienteCinta(id: number): void {
    if (this._cinta()?.id !== id) {
      return;
    }
    this._cinta.set(null);
    const siguiente = this.cola.shift();
    if (siguiente) {
      setTimeout(() => this.mostrarCinta(siguiente), PAUSA_CINTA_MS);
    }
  }
}

/** Con un popup abierto la campana queda detrás del fondo: el aviso va a la esquina. */
function hayPopupAbierto(): boolean {
  return typeof document !== 'undefined' && document.querySelector('[aria-modal="true"]') !== null;
}
