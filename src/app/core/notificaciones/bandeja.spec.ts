import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Notificaciones } from '../ui/notificaciones';
import { Bandeja, INTERVALO_MS, NotificacionBandeja } from './bandeja';

const BASE = `${environment.apiUrl}/api/v1/notificaciones`;

function aviso(parcial: Partial<NotificacionBandeja>): NotificacionBandeja {
  return {
    id: 'n1',
    tipo: 'SOPORTE',
    tono: 'INFO',
    titulo: 'El soporte entró',
    enlace: '/sastreria',
    leida: false,
    fecha: '2026-10-20T15:00:00Z',
    ...parcial,
  };
}

function pagina(contenido: NotificacionBandeja[]) {
  return { contenido, pagina: 0, tamano: 30, totalElementos: contenido.length, totalPaginas: 1 };
}

describe('Bandeja', () => {
  let http: HttpTestingController;
  let bandeja: Bandeja;
  let notificaciones: Notificaciones;
  const soporte = signal(false);

  beforeEach(() => {
    vi.useFakeTimers();
    soporte.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            autenticado: signal(true),
            soporte,
            sesion: computed(() => ({ sastreria: { tenantId: 't1' } })),
          },
        },
      ],
    });
    bandeja = TestBed.inject(Bandeja);
    notificaciones = TestBed.inject(Notificaciones);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });

  afterEach(() => vi.useRealTimers());

  it('al iniciar cuenta las no leídas sin mostrarlas de nuevo', () => {
    http.expectOne(`${BASE}/no-leidas`).flush({ cantidad: 1 });
    http.expectOne((r) => r.url === BASE).flush(pagina([aviso({})]));
    expect(bandeja.noLeidas()).toBe(1);
    expect(notificaciones.lista()).toHaveLength(0);
  });

  it('lo que llega después se muestra en pantalla y se apila sin leer', () => {
    http.expectOne(`${BASE}/no-leidas`).flush({ cantidad: 0 });
    http.expectOne((r) => r.url === BASE).flush(pagina([]));

    vi.advanceTimersByTime(INTERVALO_MS);
    http.expectOne(`${BASE}/no-leidas`).flush({ cantidad: 1 });
    http.expectOne((r) => r.url === BASE).flush(pagina([aviso({ fecha: '2026-10-21T10:00:00Z' })]));
    expect(bandeja.noLeidas()).toBe(1);
    expect(notificaciones.lista().map((n) => n.mensaje)).toEqual(['El soporte entró']);
    // Mostrarla no la vuelve a guardar.
    http.expectNone((r) => r.method === 'POST');
  });

  it('cada aviso que se muestra queda guardado en la bandeja', () => {
    http.expectOne(`${BASE}/no-leidas`).flush({ cantidad: 0 });
    http.expectOne((r) => r.url === BASE).flush(pagina([]));
    notificaciones.exito('Gasto registrado.');
    const req = http.expectOne((r) => r.method === 'POST' && r.url === BASE);
    expect(req.request.body).toEqual({ tono: 'EXITO', titulo: 'Gasto registrado.' });
  });

  it('marcar leída baja el contador al instante', () => {
    http.expectOne(`${BASE}/no-leidas`).flush({ cantidad: 1 });
    http.expectOne((r) => r.url === BASE).flush(pagina([aviso({})]));
    bandeja.marcarLeida(aviso({}));
    expect(bandeja.noLeidas()).toBe(0);
    http.expectOne(`${BASE}/n1/leida`).flush(null);
  });

  it('en modo soporte no hay bandeja ni se guarda nada', () => {
    http.expectOne(`${BASE}/no-leidas`).flush({ cantidad: 0 });
    http.expectOne((r) => r.url === BASE).flush(pagina([]));
    soporte.set(true);
    TestBed.tick();
    notificaciones.exito('Algo');
    http.expectNone((r) => r.method === 'POST');
    expect(bandeja.activa()).toBe(false);
  });
});
