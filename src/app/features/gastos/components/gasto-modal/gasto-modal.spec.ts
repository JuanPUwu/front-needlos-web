import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { Gasto } from '../../models/gasto.model';
import { GastoService } from '../../services/gasto.service';
import { GastoModal } from './gasto-modal';

function gasto(parcial: Partial<Gasto> = {}): Gasto {
  return {
    id: 'g1',
    razon: 'Hilos',
    monto: 12000,
    metodo: 'EFECTIVO',
    fecha: '2026-10-20',
    registrado: '2026-10-20T15:00:00Z',
    registradoPor: 'Ana',
    version: 3,
    ...parcial,
  };
}

describe('GastoModal', () => {
  let service: {
    obtener: ReturnType<typeof vi.fn>;
    historial: ReturnType<typeof vi.fn>;
    crear: ReturnType<typeof vi.fn>;
    corregir: ReturnType<typeof vi.fn>;
  };
  let confirmar: ReturnType<typeof vi.fn>;

  function crearComponente(id: string | null): GastoModal {
    const fixture = TestBed.createComponent(GastoModal);
    fixture.componentRef.setInput('gastoId', id);
    const c = fixture.componentInstance;
    c.ngOnInit();
    return c;
  }

  beforeEach(() => {
    service = {
      obtener: vi.fn(() => of(gasto())),
      historial: vi.fn(() => of([])),
      crear: vi.fn(() => of(gasto())),
      corregir: vi.fn(() => of(gasto({ version: 4 }))),
    };
    confirmar = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      imports: [GastoModal],
      providers: [
        { provide: GastoService, useValue: service },
        { provide: Confirmacion, useValue: { pedir: confirmar } },
      ],
    });
  });

  it('no registra sin razón o con monto en cero', () => {
    const c = crearComponente(null);
    c.form.patchValue({ razon: 'Hilos', monto: '0' });
    c.guardar();
    c.form.patchValue({ razon: '  ', monto: '1000' });
    c.guardar();
    expect(service.crear).not.toHaveBeenCalled();
  });

  it('al reintentar tras un error usa la misma clave (no duplica el gasto)', () => {
    const c = crearComponente(null);
    service.crear.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
    c.form.patchValue({ razon: 'Hilos', monto: '12000', metodo: 'NEQUI' });
    c.guardar();
    expect(c.error()).toBeTruthy();
    c.guardar();
    const [, clave1] = service.crear.mock.calls[0];
    const [req, clave2] = service.crear.mock.calls[1];
    expect(clave2).toBe(clave1);
    expect(req).toEqual(expect.objectContaining({ razon: 'Hilos', monto: 12000, metodo: 'NEQUI' }));
  });

  it('al corregir carga el gasto y envía su versión', () => {
    const c = crearComponente('g1');
    expect(c.form.controls.monto.value).toBe('12000');
    c.form.patchValue({ monto: '15000' });
    c.guardar();
    expect(service.corregir).toHaveBeenCalledWith(
      'g1',
      3,
      expect.objectContaining({ monto: 15000 }),
    );
  });

  it('cerrar con algo escrito pide confirmar', async () => {
    const c = crearComponente(null);
    const cerrado = vi.fn();
    c.cerrado.subscribe(cerrado);
    c.form.controls.razon.setValue('Hilos');
    c.form.markAsDirty();
    confirmar.mockResolvedValueOnce(false);
    await c.cerrar();
    expect(confirmar).toHaveBeenCalled();
    expect(cerrado).not.toHaveBeenCalled();
  });
});
