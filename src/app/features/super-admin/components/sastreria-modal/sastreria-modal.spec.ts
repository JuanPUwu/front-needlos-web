import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { SastreriaPlataforma } from '../../models/plataforma.model';
import { PlataformaService } from '../../services/plataforma.service';
import { SastreriaModal } from './sastreria-modal';

function sastreria(parcial: Partial<SastreriaPlataforma> = {}): SastreriaPlataforma {
  return {
    id: 't1',
    nombre: 'Sastrería Angely',
    plan: 'DEMO',
    vence: '2026-10-25T05:00:00Z',
    estado: 'PRUEBA',
    activo: true,
    registro: '2026-10-01T05:00:00Z',
    ultimoAcceso: null,
    pedidos: 3,
    personas: 2,
    admin: 'Ana Ruiz',
    adminEmail: 'ana@example.com',
    telefono: null,
    ...parcial,
  };
}

describe('SastreriaModal', () => {
  let service: {
    sastreria: ReturnType<typeof vi.fn>;
    acciones: ReturnType<typeof vi.fn>;
    otorgarLicencia: ReturnType<typeof vi.fn>;
    desactivar: ReturnType<typeof vi.fn>;
    activar: ReturnType<typeof vi.fn>;
    entrarEnSoporte: ReturnType<typeof vi.fn>;
  };
  let auth: { entrarEnSoporte: ReturnType<typeof vi.fn> };
  let confirmar: ReturnType<typeof vi.fn>;

  function crear(): SastreriaModal {
    const fixture = TestBed.createComponent(SastreriaModal);
    fixture.componentRef.setInput('sastreriaId', 't1');
    const c = fixture.componentInstance;
    c.ngOnInit();
    return c;
  }

  beforeEach(() => {
    service = {
      sastreria: vi.fn(() => of(sastreria())),
      acciones: vi.fn(() =>
        of({ contenido: [], pagina: 0, tamano: 20, totalElementos: 0, totalPaginas: 0 }),
      ),
      otorgarLicencia: vi.fn(() => of(sastreria({ plan: 'LICENCIADO', estado: 'LICENCIADA' }))),
      desactivar: vi.fn(() => of(sastreria({ activo: false, estado: 'DESACTIVADA' }))),
      activar: vi.fn(() => of(sastreria())),
      entrarEnSoporte: vi.fn(() => of({ accessToken: 'soporte' })),
    };
    auth = { entrarEnSoporte: vi.fn() };
    confirmar = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      imports: [SastreriaModal],
      providers: [
        { provide: PlataformaService, useValue: service },
        { provide: Confirmacion, useValue: { pedir: confirmar } },
        { provide: AuthService, useValue: auth },
      ],
    });
  });

  it('otorgar licencia pide confirmar con la fecha en que quedaría y avisa al panel', async () => {
    const c = crear();
    const cambios: unknown[] = [];
    c.cambiado.subscribe((x) => cambios.push(x));
    confirmar.mockResolvedValueOnce(false);
    await c.otorgar(3);
    expect(service.otorgarLicencia).not.toHaveBeenCalled();

    await c.otorgar(3);
    expect(confirmar).toHaveBeenLastCalledWith(
      expect.objectContaining({ titulo: '¿Otorgar 3 meses a Sastrería Angely?' }),
    );
    expect(service.otorgarLicencia).toHaveBeenCalledWith('t1', 3);
    expect(cambios).toEqual([expect.objectContaining({ mensaje: 'Licencia otorgada.' })]);
  });

  it('una licencia vigente suma los meses a su vencimiento; si no, cuenta desde hoy', () => {
    const c = crear();
    c.sastreria.set(sastreria({ plan: 'LICENCIADO', vence: '2099-01-15T05:00:00Z' }));
    expect(c.quedariaHasta(1).getUTCMonth()).toBe(1);
    c.sastreria.set(sastreria({ plan: 'DEMO', vence: '2099-01-15T05:00:00Z' }));
    const desdeHoy = c.quedariaHasta(1);
    expect(desdeHoy.getFullYear()).toBeLessThan(2099);
  });

  it('entrar en modo soporte pide confirmar y pasa la sesión de soporte', async () => {
    const c = crear();
    confirmar.mockResolvedValueOnce(false);
    await c.entrarEnSoporte();
    expect(service.entrarEnSoporte).not.toHaveBeenCalled();

    await c.entrarEnSoporte();
    expect(confirmar).toHaveBeenLastCalledWith(
      expect.objectContaining({ titulo: '¿Entrar a Sastrería Angely en modo soporte?' }),
    );
    expect(service.entrarEnSoporte).toHaveBeenCalledWith('t1');
    expect(auth.entrarEnSoporte).toHaveBeenCalledWith({ accessToken: 'soporte' });
  });

  it('desactivar pide confirmar; activar no', async () => {
    const c = crear();
    await c.cambiarActivo();
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(service.desactivar).toHaveBeenCalledWith('t1');

    await c.cambiarActivo();
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(service.activar).toHaveBeenCalledWith('t1');
  });
});
