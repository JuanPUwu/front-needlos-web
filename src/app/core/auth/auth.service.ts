import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { codigoDeError } from '../http/api-error';
import { Confirmacion } from '../ui/confirmacion';
import { borrarTodoLoRecordado, guardarRutaDeRegreso, tomarRutaDeRegreso } from '../estado/almacen';
import {
  LoginRequest,
  LoginResponse,
  SastreriaResumen,
  RecuperacionPendiente,
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
  private readonly confirmacion = inject(Confirmacion);
  private readonly base = `${environment.apiUrl}/api/v1/auth`;

  private readonly _sesion = signal<SesionResponse | null>(null);
  readonly sesion = this._sesion.asReadonly();
  readonly autenticado = computed(() => this._sesion() !== null);
  readonly roles = computed<Rol[]>(() => this._sesion()?.roles ?? []);
  /** Un SuperAdmin dentro de una sastrería en modo soporte (solo lectura). */
  readonly soporte = computed(() => this.roles().includes('SOPORTE'));

  private readonly _seleccionPendiente = signal<SeleccionPendiente | null>(null);
  readonly seleccionPendiente = this._seleccionPendiente.asReadonly();
  /** Inició sesión y su sastrería está en eliminación: la puede recuperar (Manual §16.1). */
  private readonly _recuperacionPendiente = signal<RecuperacionPendiente | null>(null);
  readonly recuperacionPendiente = this._recuperacionPendiente.asReadonly();
  /** Inició sesión una cuenta sin sastrería: preauth para crear la suya. */
  private readonly _sinSastreriaPendiente = signal<string | null>(null);
  readonly sinSastreriaPendiente = this._sinSastreriaPendiente.asReadonly();

  private renovacionEnCurso: Observable<SesionResponse> | null = null;

  get accessToken(): string | null {
    return this._sesion()?.accessToken ?? null;
  }

  /** Ruta de entrada segun el tipo de sesion (SUPER_ADMIN no tiene sastreria). */
  rutaInicial(): string {
    return this._sesion()?.sastreria ? '/pedidos' : '/super-admin/sastrerias';
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

  // ── Varias sastrerías por cuenta (dueño 2026-10-20) ─────────────

  /** Sastrerías de la cuenta, la última usada primero. */
  misSastrerias(): Observable<SastreriaResumen[]> {
    return this.http.get<SastreriaResumen[]>(`${this.base}/sastrerias`);
  }

  /** Pasa a otra sastrería sin volver a iniciar sesión. */
  cambiarSastreria(tenantId: string): Observable<void> {
    return this.http
      .post<SesionResponse>(`${this.base}/cambiar-sastreria`, { tenantId })
      .pipe(map((sesion) => this.entrarEnOtraSastreria(sesion)));
  }

  /** Crea otra sastrería con esta cuenta (con su propia prueba gratis) y entra a ella. */
  crearOtraSastreria(nombre: string): Observable<void> {
    return this.http
      .post<SesionResponse>(`${this.base}/sastrerias`, { nombre })
      .pipe(map((sesion) => this.entrarEnOtraSastreria(sesion)));
  }

  /**
   * Cambió de sastrería: lo recordado (borradores, filtros) era de la anterior y se olvida; se
   * recarga la app para que nada de la otra sastrería quede en pantalla. La cookie nueva ya
   * trae la sesión de esta.
   */
  private entrarEnOtraSastreria(sesion: SesionResponse): void {
    borrarTodoLoRecordado();
    this._sesion.set(sesion);
    window.location.assign(this.rutaInicial());
  }

  /** El admin recupera su sastrería en eliminación y entra (Manual §16.1). */
  recuperarSastreria(tenantId: string): Observable<void> {
    const pendiente = this._recuperacionPendiente();
    if (!pendiente) {
      this.router.navigate(['/login']);
      return of(undefined);
    }
    return this.http
      .post<SesionResponse>(`${this.base}/recuperar-sastreria`, {
        preauthToken: pendiente.preauthToken,
        tenantId,
      })
      .pipe(
        map((sesion) => {
          this._recuperacionPendiente.set(null);
          this.entrar(sesion);
        }),
      );
  }

  /** Cuenta sin sastrería: crea la suya (queda de admin) y entra (dueño 2026-10-22). */
  crearPrimeraSastreria(nombreSastreria: string): Observable<void> {
    const preauthToken = this._sinSastreriaPendiente();
    if (!preauthToken) {
      this.router.navigate(['/login']);
      return of(undefined);
    }
    return this.http
      .post<SesionResponse>(`${this.base}/crear-primera-sastreria`, {
        preauthToken,
        nombreSastreria,
      })
      .pipe(
        map((sesion) => {
          this._sinSastreriaPendiente.set(null);
          this.entrar(sesion);
        }),
      );
  }

  /** No crea su sastrería: vuelve al login. */
  cancelarSinSastreria(): void {
    this._sinSastreriaPendiente.set(null);
    this.router.navigate(['/login']);
  }

  /** No quiere recuperarla: vuelve al login. */
  cancelarRecuperacion(): void {
    this._recuperacionPendiente.set(null);
    this.router.navigate(['/login']);
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

  // ── Modo soporte (Manual §16) ────────────────────────────────────

  /**
   * Entra a una sastrería con la sesión de soporte que abrió el SuperAdmin. Esa sesión vive solo
   * en memoria (sin cookie): al recargar o vencer, se vuelve a la sesión propia del SuperAdmin.
   */
  entrarEnSoporte(sesion: SesionResponse): void {
    this._sesion.set(sesion);
    this.router.navigateByUrl('/pedidos');
  }

  /** Cierra la sesión de soporte y vuelve al panel del SuperAdmin con su propia sesión. */
  salirDeSoporte(): void {
    this.http
      .post(`${this.base}/soporte/terminar`, null)
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.renovar().subscribe({ error: () => this.salir() });
      });
  }

  // ── Renovacion y cierre ─────────────────────────────────────────

  /** Renueva la sesion con la cookie del refresh. Comparte la peticion si ya hay una en curso. */
  renovar(): Observable<SesionResponse> {
    if (!this.renovacionEnCurso) {
      this.renovacionEnCurso = this.http.post<SesionResponse>(`${this.base}/refresh`, null).pipe(
        tap((sesion) => {
          // La sesión de soporte no se renueva: vuelve la del SuperAdmin, a su panel.
          const eraSoporte = this.soporte();
          this._sesion.set(sesion);
          if (eraSoporte && !this.soporte()) {
            this.router.navigateByUrl(this.rutaInicial());
          }
        }),
        finalize(() => (this.renovacionEnCurso = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.renovacionEnCurso;
  }

  /** Se ejecuta al arrancar la app: recupera la sesion si la cookie sigue vigente. */
  restaurarSesion(): Observable<unknown> {
    return this.renovar().pipe(
      catchError((error: unknown) => {
        // Al recargar, solo se explica si la sesión se CERRÓ (no si nunca la hubo o venció).
        if (codigoDeError(error) === 'SESION_CERRADA') {
          this.avisarSalida(error);
        }
        return of(null);
      }),
    );
  }

  cerrarSesion(): void {
    this.http
      .post(`${this.base}/logout`, null)
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        // Cierre voluntario: se olvida todo lo recordado en este computador.
        borrarTodoLoRecordado();
        this.salir();
      });
  }

  /**
   * La sesion ya no es valida en el servidor: limpia el estado local, vuelve al login y le explica
   * al usuario por qué (dueño 2026-10-22: que no se sienta brusco).
   */
  sesionExpirada(error?: unknown): void {
    // Al volver a entrar, se regresa al mismo punto (los borradores se conservan).
    guardarRutaDeRegreso(this.router.url);
    this.salir();
    this.avisarSalida(error);
  }

  /** Mensaje centrado con "Aceptar": la sesión se cerró en otro lado o venció. */
  private avisarSalida(error: unknown): void {
    const cerrada = codigoDeError(error) === 'SESION_CERRADA';
    void this.confirmacion.avisar({
      tipo: 'info',
      titulo: cerrada ? 'Se cerró tu sesión' : 'Tu sesión venció',
      mensaje: cerrada
        ? 'Tu sesión se cerró desde otro dispositivo o por un cambio en tu cuenta (por ejemplo, la contraseña). Inicia sesión de nuevo para continuar.'
        : 'Por seguridad, vuelve a iniciar sesión. Al entrar seguirás donde ibas.',
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private procesarLogin(res: LoginResponse): void {
    if (res.recuperables?.length && res.preauthToken) {
      this._recuperacionPendiente.set({
        preauthToken: res.preauthToken,
        sastrerias: res.recuperables,
      });
      this.router.navigate(['/recuperar-sastreria']);
      return;
    }
    if (res.sinSastreria && res.preauthToken) {
      this._sinSastreriaPendiente.set(res.preauthToken);
      this.router.navigate(['/crear-mi-sastreria']);
      return;
    }
    if (res.requiereSeleccion && res.preauthToken && res.sastrerias?.length) {
      // Con varias sastrerias se entra directo a la primera; el cambio de sastreria
      // se hara mas adelante desde dentro de la app. Si falla, cae al selector.
      this._seleccionPendiente.set({ preauthToken: res.preauthToken, sastrerias: res.sastrerias });
      this.seleccionar(res.sastrerias[0].tenantId).subscribe({
        error: () => this.router.navigate(['/elegir-sastreria']),
      });
    } else if (res.sesion) {
      this.entrar(res.sesion);
    }
  }

  private entrar(sesion: SesionResponse): void {
    this._sesion.set(sesion);
    this._seleccionPendiente.set(null);
    const regreso = sesion.sastreria ? tomarRutaDeRegreso() : null;
    this.router.navigateByUrl(regreso ?? this.rutaInicial());
  }

  private salir(): void {
    this._sesion.set(null);
    this._seleccionPendiente.set(null);
    this.router.navigate(['/login']);
  }
}
