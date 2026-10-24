import { TestBed } from '@angular/core/testing';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TipoPrenda } from '../../models/tipo-prenda.model';
import { TipoPrendaService } from '../../services/tipo-prenda.service';
import { Catalogo } from './catalogo';

function tipo(parcial: Partial<TipoPrenda> = {}): TipoPrenda {
  return { id: 't1', nombre: 'Camisa', precioBase: null, activo: true, version: 0, ...parcial };
}

describe('Catalogo', () => {
  let service: {
    listar: ReturnType<typeof vi.fn>;
    crear: ReturnType<typeof vi.fn>;
    actualizar: ReturnType<typeof vi.fn>;
    desactivar: ReturnType<typeof vi.fn>;
    reactivar: ReturnType<typeof vi.fn>;
  };
  let componente: Catalogo;

  beforeEach(() => {
    service = {
      listar: vi.fn(() => of([tipo()])),
      crear: vi.fn(() => of(tipo())),
      actualizar: vi.fn(() => of(tipo())),
      desactivar: vi.fn(() => of(tipo({ activo: false }))),
      reactivar: vi.fn(() => of(tipo())),
    };
    TestBed.configureTestingModule({
      imports: [Catalogo],
      providers: [provideRouter([]), { provide: TipoPrendaService, useValue: service }],
    });
    componente = TestBed.createComponent(Catalogo).componentInstance;
  });

  it('crea con precio base opcional (vacío = sin precio)', () => {
    componente.form.setValue({ nombre: ' Abrigo ', precioBase: '' });
    componente.enviar();
    expect(service.crear).toHaveBeenCalledWith({ nombre: 'Abrigo', precioBase: null });
  });

  it('el precio es en pesos: entero y múltiplo de 50 (sin decimales)', () => {
    componente.form.setValue({ nombre: 'Abrigo', precioBase: '25000,5' });
    componente.enviar();
    componente.form.setValue({ nombre: 'Abrigo', precioBase: '25020' });
    componente.enviar();
    expect(service.crear).not.toHaveBeenCalled();

    componente.form.setValue({ nombre: 'Abrigo', precioBase: '25050' });
    componente.enviar();
    expect(service.crear).toHaveBeenCalledWith({ nombre: 'Abrigo', precioBase: 25050 });
  });

  it('rechaza precios con separador de miles (25.000 sería ambiguo)', () => {
    componente.form.setValue({ nombre: 'Abrigo', precioBase: '25.000' });
    componente.enviar();
    expect(service.crear).not.toHaveBeenCalled();
  });

  it('al editar envía la versión leída', () => {
    componente.editar(tipo({ id: 't9', version: 4, precioBase: 30000 }));
    componente.enviar();
    expect(service.actualizar).toHaveBeenCalledWith('t9', 4, {
      nombre: 'Camisa',
      precioBase: 30000,
    });
  });

  it('desactivar pide confirmar y luego actualiza el estado en la lista', async () => {
    componente.ngOnInit();
    const pedir = vi.spyOn(TestBed.inject(Confirmacion), 'pedir').mockResolvedValueOnce(false);
    await componente.desactivar(tipo());
    expect(service.desactivar).not.toHaveBeenCalled();

    pedir.mockResolvedValueOnce(true);
    await componente.desactivar(tipo());
    expect(service.desactivar).toHaveBeenCalledWith('t1');
    expect(componente.inactivos()).toBe(1);
  });

  it('filtra por nombre (sin tildes) y por estado en el navegador', () => {
    service.listar.mockReturnValue(
      of([
        tipo({ id: 'a', nombre: 'Pantalón' }),
        tipo({ id: 'b', nombre: 'Camisa', activo: false }),
        tipo({ id: 'c', nombre: 'Saco' }),
      ]),
    );
    componente.ngOnInit();

    componente.alBuscar('pantalon');
    expect(componente.visibles().map((t) => t.id)).toEqual(['a']);

    componente.alBuscar('');
    componente.alCambiarEstado('inactivos');
    expect(componente.visibles().map((t) => t.id)).toEqual(['b']);
    expect(componente.hayFiltros()).toBe(true);

    componente.limpiarFiltros();
    expect(componente.visibles().length).toBe(3);
  });
});
