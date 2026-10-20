import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { EstadoSastreria } from './estado-sastreria';
import { PermisosService } from './permisos';

describe('PermisosService', () => {
  let http: HttpTestingController;
  let permisos: PermisosService;
  let estado: EstadoSastreria;
  const soporte = signal(false);

  beforeEach(() => {
    soporte.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { sesion: signal({ sastreria: { tenantId: 't1' } }), soporte },
        },
      ],
    });
    permisos = TestBed.inject(PermisosService);
    estado = TestBed.inject(EstadoSastreria);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    http
      .expectOne(`${environment.apiUrl}/api/v1/permisos/mios`)
      .flush({ accesoId: 'a1', admin: true, permisos: [] });
  });

  function responderEstado(soloLectura: boolean): void {
    http.expectOne(`${environment.apiUrl}/api/v1/sastreria/estado`).flush({
      plan: 'DEMO',
      vence: '2026-11-01T05:00:00Z',
      diasRestantes: soloLectura ? 0 : 10,
      soloLectura,
      porVencer: false,
      soporte: soporte(),
      visitaSoporte: null,
      visitaSoporteSinVer: false,
    });
  }

  it('el admin puede todo mientras la sastrería está vigente', () => {
    responderEstado(false);
    expect(permisos.puede('GESTIONAR_INVENTARIO')).toBe(true);
  });

  it('en solo lectura nadie puede cambiar nada, ni el admin', () => {
    responderEstado(true);
    expect(estado.soloLectura()).toBe(true);
    expect(permisos.puede('CREAR_PEDIDOS')).toBe(false);
    expect(permisos.puede('GESTIONAR_INVENTARIO')).toBe(false);
  });

  it('en modo soporte (un SuperAdmin) tampoco se cambia nada', () => {
    soporte.set(true);
    responderEstado(false);
    expect(estado.soloLectura()).toBe(true);
    expect(permisos.puede('REGISTRAR_ABONOS')).toBe(false);
  });

  it('el aviso de la visita de soporte se marca visto una sola vez y nunca desde el soporte', () => {
    http.expectOne(`${environment.apiUrl}/api/v1/sastreria/estado`).flush({
      plan: 'DEMO',
      vence: null,
      diasRestantes: null,
      soloLectura: false,
      porVencer: false,
      soporte: false,
      visitaSoporte: '2026-10-20T15:00:00Z',
      visitaSoporteSinVer: true,
    });
    estado.marcarSoporteVisto();
    http.expectOne(`${environment.apiUrl}/api/v1/sastreria/soporte-visto`).flush(null);
    expect(estado.estado()?.visitaSoporteSinVer).toBe(false);
    estado.marcarSoporteVisto();
    http.expectNone(`${environment.apiUrl}/api/v1/sastreria/soporte-visto`);
  });
});
