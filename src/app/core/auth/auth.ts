import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RefreshResponse, SessionInfo } from '../../models/auth';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  private accessToken: string | null = null;
  private session: SessionInfo | null = null;

  // — Login ──────────────────────────────────────────────────────────────────
  login(req: LoginRequest): Promise<void> {
    return firstValueFrom(
      this.http
        .post<LoginResponse>(`${this.baseUrl}/api/auth/login`, req, { withCredentials: true })
        .pipe(
          map((res) => {
            this.accessToken = res.accessToken;
            this.session = { tenantId: res.tenantId, email: res.email };
          }),
        ),
    );
  }

  // — Logout ─────────────────────────────────────────────────────────────────
  logout(): Promise<void> {
    return firstValueFrom(
      this.http
        .post<void>(`${this.baseUrl}/api/auth/logout`, {}, { withCredentials: true })
        .pipe(
          map(() => {
            this.accessToken = null;
            this.session = null;
          }),
        ),
    );
  }

  // — Refresh (usado por el interceptor — devuelve Observable) ───────────────
  refresh(): Observable<void> {
    return this.http
      .post<RefreshResponse>(`${this.baseUrl}/api/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        map((res) => {
          this.accessToken = res.accessToken;
        }),
      );
  }

  // — Silent refresh al iniciar la app (APP_INITIALIZER) ────────────────────
  initializeSession(): Promise<boolean> {
    return firstValueFrom(
      this.http
        .post<RefreshResponse>(`${this.baseUrl}/api/auth/refresh`, {}, { withCredentials: true })
        .pipe(
          map((res) => {
            this.accessToken = res.accessToken;
            return true;
          }),
        ),
    ).catch(() => {
      this.accessToken = null;
      this.session = null;
      return false;
    });
  }

  // — Helpers ────────────────────────────────────────────────────────────────
  getToken(): string | null {
    return this.accessToken;
  }

  isLoggedIn(): boolean {
    return this.accessToken !== null;
  }

  getSession(): SessionInfo | null {
    return this.session;
  }
}
