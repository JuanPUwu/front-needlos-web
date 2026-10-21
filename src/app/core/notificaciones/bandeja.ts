import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Pagina } from '../http/pagina.model';
import { Notificaciones, TipoNotificacion } from '../ui/notificaciones';

export type TonoBandeja = 'EXITO' | 'INFO' | 'ALERTA' | 'ERROR';

export interface NotificacionBandeja {
  id: string;
  tipo:
    'PROPIA' | 'SOPORTE' | 'VENCIMIENTO' | 'LICENCIA' | 'PEDIDO' | 'EXPORTACION' | 'ELIMINACION';
  tono: TonoBandeja;
  titulo: string;
  /** Ruta de la app a la que lleva; null si no lleva a ningún lado. */
  enlace: string | null;
  leida: boolean;
  fecha: string;
}

/** Cada cuánto se pregunta si llegó algo nuevo. */
export const INTERVALO_MS = 60_000;
const TAMANO = 30;

const TONO_DE: Record<TipoNotificacion, TonoBandeja> = {
  exito: 'EXITO',
  info: 'INFO',
  error: 'ERROR',
};

/**
 * Bandeja de notificaciones (Manual §19), guardada en el servidor para cada persona en su
 * sastrería. Todo aviso que se muestra en pantalla queda aquí (ya leído); los avisos de eventos
 * (soporte, vencimientos, licencias, pedidos de otros) llegan sin leer, se muestran al llegar y se
 * apilan. En modo soporte no hay bandeja: esa sesión no es de la persona.
 */
@Injectable({ providedIn: 'root' })
export class Bandeja {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly notificaciones = inject(Notificaciones);
  private readonly base = `${environment.apiUrl}/api/v1/notificaciones`;

  readonly lista = signal<NotificacionBandeja[] | null>(null);
  readonly noLeidas = signal(0);
  readonly activa = computed(() => this.auth.autenticado() && !this.auth.soporte());
  /** La sastrería de la sesión: cada una tiene su propia bandeja. */
  private readonly clave = computed(() =>
    this.activa() ? (this.auth.sesion()?.sastreria?.tenantId ?? 'plataforma') : null,
  );

  private temporizador: ReturnType<typeof setInterval> | null = null;
  /** Lo más reciente que ya se mostró (para avisar solo lo que llega después). */
  private ultimaVista: string | null = null;

  constructor() {
    this.notificaciones.alMostrar = (tipo, mensaje) => this.guardar(tipo, mensaje);
    effect(() => {
      const clave = this.clave();
      untracked(() => {
        this.detener();
        this.lista.set(null);
        this.noLeidas.set(0);
        this.ultimaVista = null;
        if (clave) {
          this.revisar(true);
          this.temporizador = setInterval(() => this.revisar(false), INTERVALO_MS);
        }
      });
    });
  }

  /** Carga (o recarga) la lista del panel. */
  cargar(): void {
    if (!this.activa()) {
      return;
    }
    const params = new HttpParams().set('page', 0).set('size', TAMANO);
    this.http.get<Pagina<NotificacionBandeja>>(this.base, { params }).subscribe({
      next: (p) => this.lista.set(p.contenido),
      error: () => this.lista.set(this.lista() ?? []),
    });
  }

  marcarLeida(n: NotificacionBandeja): void {
    if (n.leida) {
      return;
    }
    this.lista.update((l) => l?.map((x) => (x.id === n.id ? { ...x, leida: true } : x)) ?? l);
    this.noLeidas.update((c) => Math.max(0, c - 1));
    this.http.post<void>(`${this.base}/${n.id}/leida`, null).subscribe({ error: () => undefined });
  }

  marcarTodas(): void {
    this.lista.update((l) => l?.map((x) => ({ ...x, leida: true })) ?? l);
    this.noLeidas.set(0);
    this.http.post<void>(`${this.base}/leidas`, null).subscribe({ error: () => undefined });
  }

  /** Lo que se mostró en pantalla queda en la bandeja (ya leído). */
  private guardar(tipo: TipoNotificacion, mensaje: string): void {
    if (!this.activa()) {
      return;
    }
    this.http
      .post<void>(this.base, { tono: TONO_DE[tipo], titulo: mensaje.slice(0, 300) })
      .subscribe({
        next: () => {
          if (this.lista() !== null) {
            this.cargar();
          }
        },
        error: () => undefined,
      });
  }

  /**
   * Pregunta cuántas hay sin leer. Si llegaron nuevas desde la última vez, las muestra en
   * pantalla (sin volver a guardarlas). La primera vez solo toma nota de lo que ya había.
   */
  private revisar(primera: boolean): void {
    this.http.get<{ cantidad: number }>(`${this.base}/no-leidas`).subscribe({
      next: ({ cantidad }) => {
        const llegaron = cantidad > this.noLeidas();
        this.noLeidas.set(cantidad);
        if (primera || llegaron) {
          this.traerNuevas(primera);
        }
      },
      error: () => undefined,
    });
  }

  private traerNuevas(primera: boolean): void {
    const params = new HttpParams().set('page', 0).set('size', TAMANO);
    this.http.get<Pagina<NotificacionBandeja>>(this.base, { params }).subscribe({
      next: (p) => {
        const desde = this.ultimaVista;
        if (!primera && desde) {
          p.contenido
            .filter((n) => !n.leida && n.fecha > desde)
            .reverse()
            .forEach((n) => this.notificaciones.mostrarSinGuardar(tipoDe(n.tono), n.titulo));
        }
        this.ultimaVista = p.contenido[0]?.fecha ?? desde ?? new Date(0).toISOString();
        if (this.lista() !== null) {
          this.lista.set(p.contenido);
        }
      },
      error: () => undefined,
    });
  }

  private detener(): void {
    if (this.temporizador) {
      clearInterval(this.temporizador);
      this.temporizador = null;
    }
  }
}

function tipoDe(tono: TonoBandeja): TipoNotificacion {
  return tono === 'ERROR' ? 'error' : tono === 'EXITO' ? 'exito' : 'info';
}
