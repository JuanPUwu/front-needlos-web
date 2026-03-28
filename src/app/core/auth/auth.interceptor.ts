import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { Auth } from './auth';
import { APP_ROUTES } from '../constants/app-constants';

// Endpoints que nunca deben pasar por la lógica de retry 401
const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/logout'];

const isAuthEndpoint = (url: string): boolean =>
  AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

// Estado compartido del proceso de refresh (vive fuera de la función para ser singleton)
let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<ReturnType<typeof next> extends Observable<infer T> ? T : never> => {
  const auth = inject(Auth);
  const router = inject(Router);

  const enriched = enrichRequest(req, auth.getToken());

  return next(enriched).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthEndpoint(req.url)) {
        return handle401(enriched, next, auth, router);
      }
      return throwError(() => error);
    }),
  ) as ReturnType<typeof next>;
};

// Añade Authorization y withCredentials al request
function enrichRequest(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return req.clone({ setHeaders: headers, withCredentials: true });
}

// Gestiona el 401: refresh → reintentar (con protección ante race condition)
function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: Auth,
  router: Router,
): Observable<unknown> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject.next(null);

    return auth.refresh().pipe(
      switchMap(() => {
        isRefreshing = false;
        const newToken = auth.getToken()!;
        refreshSubject.next(newToken);
        return next(enrichRequest(req, newToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        refreshSubject.next(null);
        auth.logout().finally(() => router.navigate([`/${APP_ROUTES.LOGIN}`]));
        return throwError(() => err);
      }),
    );
  }

  // Otro request ya está haciendo refresh — esperar a que termine
  return refreshSubject.pipe(
    filter((token) => token !== null),
    take(1),
    switchMap((token) => next(enrichRequest(req, token))),
  );
}
