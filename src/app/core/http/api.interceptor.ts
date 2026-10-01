import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

/** Tiempo maximo de espera de una peticion (Reglas §11). */
export const TIEMPO_MAXIMO_MS = 20_000;

/** Endpoints de autenticacion que no llevan access token ni disparan renovacion. */
const AUTH_PUBLICO =
  /\/api\/v1\/auth\/(login|google|seleccionar-sastreria|registrar-sastreria(-google)?|refresh|logout|recuperar-contrasena|restablecer-contrasena)$/;

/**
 * Interceptor unico de la API (Reglas §12.1):
 *  · Envia cookies (withCredentials) para que viaje la cookie HttpOnly del refresh.
 *  · Adjunta el access token en memoria.
 *  · Ante un 401 renueva la sesion una vez y repite la peticion; si no se
 *    puede renovar, cierra la sesion local.
 *  · Aplica un tiempo maximo de espera.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const esAuthPublico = AUTH_PUBLICO.test(req.url);

  const preparar = (original: HttpRequest<unknown>): HttpRequest<unknown> => {
    const token = auth.accessToken;
    return original.clone({
      withCredentials: true,
      setHeaders: token && !esAuthPublico ? { Authorization: `Bearer ${token}` } : {},
    });
  };

  return next(preparar(req)).pipe(
    timeout(TIEMPO_MAXIMO_MS),
    catchError((error: unknown) => {
      const debeRenovar =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !esAuthPublico &&
        auth.accessToken !== null;
      if (!debeRenovar) {
        return throwError(() => error);
      }
      return auth.renovar().pipe(
        catchError((errorRenovacion: unknown) => {
          auth.sesionExpirada();
          return throwError(() => errorRenovacion);
        }),
        switchMap(() => next(preparar(req)).pipe(timeout(TIEMPO_MAXIMO_MS))),
      );
    }),
  );
};
