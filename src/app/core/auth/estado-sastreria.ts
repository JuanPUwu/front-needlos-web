import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/** Plan de la sastrería y su vencimiento (Manual §16). */
export interface EstadoPlan {
  plan: 'DEMO' | 'LICENCIADO';
  /** ISO; null si no vence. */
  vence: string | null;
  diasRestantes: number | null;
  /** Vencida la prueba o la licencia: se ve todo, no se cambia nada. */
  soloLectura: boolean;
  /** Faltan 7 días o menos. */
  porVencer: boolean;
  /** La sesión es de soporte (un SuperAdmin, solo lectura). */
  soporte: boolean;
  /** ISO de la última visita de soporte; null si nunca hubo. */
  visitaSoporte: string | null;
  /** El admin aún no ha visto el aviso de esa visita. */
  visitaSoporteSinVer: boolean;
}

/**
 * Estado del plan de la sastrería activa (para todo el equipo). Se carga solo al entrar o cambiar
 * de sastrería. En solo lectura, las acciones que cambian datos se ocultan (`PermisosService`) y el
 * backend las rechaza igual (403 `LICENCIA_VENCIDA`).
 */
@Injectable({ providedIn: 'root' })
export class EstadoSastreria {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly estado = signal<EstadoPlan | null>(null);
  /** Licencia vencida o modo soporte: se ve todo, no se cambia nada. */
  readonly soloLectura = computed(() => this.estado()?.soloLectura || this.auth.soporte());
  readonly porVencer = computed(() => this.estado()?.porVencer ?? false);

  constructor() {
    effect(() => {
      const tenant = this.auth.sesion()?.sastreria?.tenantId ?? null;
      if (!tenant) {
        this.estado.set(null);
        return;
      }
      this.recargar();
    });
  }

  /** El admin vio el aviso de la visita de soporte (nunca desde el propio soporte). */
  marcarSoporteVisto(): void {
    const e = this.estado();
    if (!e?.visitaSoporteSinVer || this.auth.soporte()) {
      return;
    }
    this.estado.set({ ...e, visitaSoporteSinVer: false });
    this.http
      .post<void>(`${environment.apiUrl}/api/v1/sastreria/soporte-visto`, null)
      .subscribe({ error: () => this.recargar() });
  }

  recargar(): void {
    this.http.get<EstadoPlan>(`${environment.apiUrl}/api/v1/sastreria/estado`).subscribe({
      next: (e) => this.estado.set(e),
      error: () => this.estado.set(null),
    });
  }
}
