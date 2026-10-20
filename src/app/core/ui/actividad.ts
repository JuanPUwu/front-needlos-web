import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Acciones en curso (Reglas §12.2: "todo proceso muestra que está cargando y bloquea otras
 * acciones"). Cuenta las peticiones que cambian datos (POST, PUT, PATCH, DELETE: iniciar
 * sesión, crear un pedido, registrar un abono…). Mientras haya alguna, `app-bloqueo`
 * cubre la pantalla con un indicador y no deja hacer clic en nada más.
 */
@Injectable({ providedIn: 'root' })
export class Actividad {
  private readonly enCurso = signal(0);
  readonly ocupado = computed(() => this.enCurso() > 0);

  empezar(): void {
    this.enCurso.update((n) => n + 1);
  }

  terminar(): void {
    this.enCurso.update((n) => Math.max(n - 1, 0));
  }
}

/** Renovar la sesión o salir pasan en segundo plano: no bloquean la pantalla. */
const SIN_BLOQUEO = /\/api\/v1\/auth\/(refresh|logout)$/;

export const actividadInterceptor: HttpInterceptorFn = (req, next) => {
  const cambiaDatos = req.method !== 'GET' && req.method !== 'HEAD';
  if (!cambiaDatos || !req.url.startsWith(environment.apiUrl) || SIN_BLOQUEO.test(req.url)) {
    return next(req);
  }
  const actividad = inject(Actividad);
  actividad.empezar();
  return next(req).pipe(finalize(() => actividad.terminar()));
};
