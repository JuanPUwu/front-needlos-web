import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { apiInterceptor } from './api.interceptor';

describe('apiInterceptor', () => {
  const api = environment.apiUrl;
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: {
    accessToken: string | null;
    renovar: ReturnType<typeof vi.fn>;
    sesionExpirada: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    auth = { accessToken: 'token-1', renovar: vi.fn(), sesionExpirada: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('adjunta el access token y envia cookies a la API', () => {
    http.get(`${api}/api/v1/clientes`).subscribe();

    const req = backend.expectOne(`${api}/api/v1/clientes`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('no adjunta el token en los endpoints publicos de autenticacion', () => {
    http.post(`${api}/api/v1/auth/refresh`, null).subscribe();

    const req = backend.expectOne(`${api}/api/v1/auth/refresh`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('no toca peticiones a otros dominios', () => {
    http.get('https://otro.com/recurso').subscribe();

    const req = backend.expectOne('https://otro.com/recurso');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.withCredentials).toBe(false);
    req.flush({});
  });

  it('ante un 401 renueva la sesion y repite la peticion con el token nuevo', () => {
    auth.renovar.mockImplementation(() => {
      auth.accessToken = 'token-2';
      return of({});
    });
    let respuesta: unknown;
    http.get(`${api}/api/v1/clientes`).subscribe((r) => (respuesta = r));

    backend
      .expectOne(`${api}/api/v1/clientes`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    const reintento = backend.expectOne(`${api}/api/v1/clientes`);
    expect(reintento.request.headers.get('Authorization')).toBe('Bearer token-2');
    reintento.flush(['ok']);

    expect(auth.renovar).toHaveBeenCalledTimes(1);
    expect(respuesta).toEqual(['ok']);
  });

  it('si la renovacion falla, cierra la sesion local', () => {
    auth.renovar.mockReturnValue(throwError(() => new Error('sin sesion')));
    let fallo = false;
    http.get(`${api}/api/v1/clientes`).subscribe({ error: () => (fallo = true) });

    backend
      .expectOne(`${api}/api/v1/clientes`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.sesionExpirada).toHaveBeenCalled();
    expect(fallo).toBe(true);
  });

  it('sin sesion en memoria no intenta renovar', () => {
    auth.accessToken = null;
    http.get(`${api}/api/v1/clientes`).subscribe({ error: () => undefined });

    backend
      .expectOne(`${api}/api/v1/clientes`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.renovar).not.toHaveBeenCalled();
  });
});
