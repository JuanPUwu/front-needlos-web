import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  RegistrarSastreriaGoogleRequest,
  RegistrarSastreriaRequest,
  RegistroPendienteResponse,
  Rol,
  SeleccionPendiente,
  SesionResponse,
} from './auth.model';

/**
 * Estado y flujo de la sesion (Reglas §8.1):
 *  · El access token se guarda SOLO en memoria (signal). Nunca en localStorage.
 *  · Al cargar la app se intenta recuperar la sesion con la cookie HttpOnly
 *    del refresh (renovacion silenciosa).
 *  · Las renovaciones simultaneas se comparten en una sola peticion.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${environment.apiUrl}/api/v1/auth`;

  private readonly _sesion = signal<SesionResponse | null>(null);
  readonly sesion = this._sesion.asReadonly();
  readonly autenticado = computed(() => this._sesion() !== null);
  readonly roles = computed<Rol[]>(() => this._sesion()?.roles ?? []);

  private readonly _seleccionPendiente = signal<SeleccionPendiente | null>(null);
  readonly seleccionPendiente = this._seleccionPendiente.asReadonly();

  private renovacionEnCurso: Observable<SesionResponse> | null = null;

  get accessToken(): string | null {
    return this._sesion()?.accessToken ?? null;
  }

  /** Ruta de entrada segun el tipo de sesion (SUPER_ADMIN no tiene sastreria). */
  rutaInicial(): string {
    return this._sesion()?.sastreria ? '/inicio' : '/super-admin';
  }

  // ── Inicio de sesion ────────────────────────────────────────────

  login(req: LoginRequest): Observable<void> {
    return this.http
      .post<LoginResponse>(`${this.base}/login`, req)
      .pipe(map((res) => this.procesarLogin(res)));
  }

  loginGoogle(idToken: string): Observable<void> {
    return this.http
      .post<LoginResponse>(`${this.base}/google`, { idToken })
      .pipe(map((res) => this.procesarLogin(res)));
  }

  seleccionar(tenantId: string): Observable<void> {
    const pendiente = this._seleccionPendiente();
    if (!pendiente) {
      this.router.navigate(['/login']);
      return of(undefined);
    }
    return this.http
      .post<SesionResponse>(`${this.base}/seleccionar-sastreria`, {
        preauthToken: pendiente.preauthToken,
        tenantId,
      })
      .pipe(map((sesion) => this.entrar(sesion)));
  }

  // ── Registro de sastreria ─────────────────────────────────────────

  /**
   * Con correo y contrasena NO entra todavia: falta confirmar el codigo de 6
   * digitos que se envia a ese correo (ver {@link verificarCorreo}). Google ya
   * verifica el correo solo, por eso {@link registrarSastreriaGoogle} si entra directo.
   */
  registrarSastreria(req: RegistrarSastreriaRequest): Observable<RegistroPendienteResponse> {
    return this.http.post<RegistroPendienteResponse>(`${this.base}/registrar-sastreria`, req);
  }

  registrarSastreriaGoogle(req: RegistrarSastreriaGoogleRequest): Observable<void> {
    return this.http
      .post<SesionResponse>(`${this.base}/registrar-sastreria-google`, req)
      .pipe(map((sesion) => this.entrar(sesion)));
  }

  /** Confirma el codigo de verificacion y entra directo con una sesion nueva. */
  verificarCorreo(email: string, codigo: string): Observable<void> {
    return this.http
      .post<SesionResponse>(`${this.base}/verificar-correo`, { email, codigo })
      .pipe(map((sesion) => this.entrar(sesion)));
  }

  /** Pide un codigo nuevo. El backend responde igual exista o no la cuenta, o ya este verificada. */
  reenviarCodigo(email: string): Observable<void> {
    return this.http.post<void>(`${this.base}/reenviar-codigo`, { email });
  }

  // ── Renovacion y cierre ─────────────────────────────────────────

  /** Renueva la sesion con la cookie del refresh. Comparte la peticion si ya hay una en curso. */
  renovar(): Observable<SesionResponse> {
    if (!this.renovacionEnCurso) {
      this.renovacionEnCurso = this.http.post<SesionResponse>(`${this.base}/refresh`, null).pipe(
        tap((sesion) => this._sesion.set(sesion)),
        finalize(() => (this.renovacionEnCurso = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.renovacionEnCurso;
  }

  /** Se ejecuta al arrancar la app: recupera la sesion si la cookie sigue vigente. */
  restaurarSesion(): Observable<unknown> {
    return this.renovar().pipe(catchError(() => of(null)));
  }

  cerrarSesion(): void {
    this.http
      .post(`${this.base}/logout`, null)
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.salir());
  }

  /** La sesion ya no es valida en el servidor: limpia el estado local y vuelve al login. */
  sesionExpirada(): void {
    this.salir();
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private procesarLogin(res: LoginResponse): void {
    if (res.requiereSeleccion && res.preauthToken && res.sastrerias) {
      this._seleccionPendiente.set({ preauthToken: res.preauthToken, sastrerias: res.sastrerias });
      this.router.navigate(['/elegir-sastreria']);
    } else if (res.sesion) {
      this.entrar(res.sesion);
    }
  }

  private entrar(sesion: SesionResponse): void {
    this._sesion.set(sesion);
    this._seleccionPendiente.set(null);
    this.router.navigate([this.rutaInicial()]);
  }

  private salir(): void {
    this._sesion.set(null);
    this._seleccionPendiente.set(null);
    this.router.navigate(['/login']);
  }
}
