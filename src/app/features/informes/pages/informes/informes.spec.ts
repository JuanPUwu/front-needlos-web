import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { InformeService } from '../../services/informe.service';
import { Informes } from './informes';

const VENTAS = {
  desde: '2026-10-01',
  hasta: '2026-10-05',
  pedidos: 2,
  ventas: 90000,
  ticketPromedio: 45000,
  ingresos: 35000,
  porMetodo: [],
  porDia: [],
};

describe('Informes', () => {
  let service: {
    ventas: ReturnType<typeof vi.fn>;
    cartera: ReturnType<typeof vi.fn>;
    productividad: ReturnType<typeof vi.fn>;
    prendasYClientes: ReturnType<typeof vi.fn>;
  };
  let navegar: ReturnType<typeof vi.fn>;

  function crear(query: Params = {}): Informes {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
    });
    const c = TestBed.createComponent(Informes).componentInstance;
    c.ngOnInit();
    return c;
  }

  beforeEach(() => {
    service = {
      ventas: vi.fn(() => of(VENTAS)),
      cartera: vi.fn(() => of({ totalAdeudado: 0 })),
      productividad: vi.fn(() => of({ sastres: [] })),
      prendasYClientes: vi.fn(() => of({ prendas: [], clientes: [] })),
    };
    navegar = vi.fn(() => Promise.resolve(true));
    TestBed.configureTestingModule({
      imports: [Informes],
      providers: [
        { provide: InformeService, useValue: service },
        { provide: Router, useValue: { navigate: navegar } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });
  });

  it('recupera el rango de la URL y pide los informes de ese periodo', () => {
    const c = crear({ periodo: 'rango', desde: '2026-10-01', hasta: '2026-10-05' });
    expect(service.ventas).toHaveBeenCalledWith('2026-10-01', '2026-10-05');
    expect(service.productividad).toHaveBeenCalledWith('2026-10-01', '2026-10-05');
    expect(service.prendasYClientes).toHaveBeenCalledWith('2026-10-01', '2026-10-05');
    expect(c.ventas().datos?.ventas).toBe(90000);
  });

  it('la cartera es una foto de hoy: no se vuelve a pedir al cambiar el periodo', () => {
    const c = crear();
    c.elegir('mes');
    expect(service.cartera).toHaveBeenCalledTimes(1);
    expect(service.ventas).toHaveBeenCalledTimes(2);
    expect(navegar.mock.calls.at(-1)![1].queryParams).toMatchObject({ periodo: 'mes' });
  });

  it('si un informe falla, los demás se ven igual', () => {
    service.productividad.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const c = crear();
    expect(c.productividad().error).toBeTruthy();
    expect(c.ventas().datos).not.toBeNull();
  });

  it('el rango exige las dos fechas en orden', () => {
    const c = crear();
    c.elegir('rango');
    c.rango.setValue({ desde: '2026-10-10', hasta: '2026-10-01' });
    service.ventas.mockClear();
    c.verRango();
    expect(c.errorRango('hasta')).toBe('Antes de "Desde"');
    expect(service.ventas).not.toHaveBeenCalled();
  });

  it('un pedido de la cartera abre su detalle en Pedidos', () => {
    const c = crear();
    c.abrirPedido('p1');
    expect(navegar).toHaveBeenLastCalledWith(['/pedidos'], {
      queryParams: { pedido: 'p1', estado: '' },
    });
  });
});
