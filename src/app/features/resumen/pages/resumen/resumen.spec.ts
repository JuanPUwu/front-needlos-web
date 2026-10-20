import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { Resumen as ResumenDatos } from '../../models/resumen.model';
import { ResumenService } from '../../services/resumen.service';
import { Resumen } from './resumen';

const CEROS = { ingresos: 0, devoluciones: 0, egresos: 0, neto: 0 };

function datos(desde: string, hasta: string): ResumenDatos {
  return {
    desde,
    hasta,
    horaInicio: '05:00',
    horaFin: '23:00',
    estado: null,
    total: CEROS,
    efectivo: CEROS,
    transferencias: { ...CEROS, porMetodo: [] },
    dias: [],
  };
}

const PAGINA = { contenido: [], pagina: 0, tamano: 20, totalElementos: 45, totalPaginas: 3 };

describe('Resumen', () => {
  let service: { obtener: ReturnType<typeof vi.fn>; movimientos: ReturnType<typeof vi.fn> };
  let navegar: ReturnType<typeof vi.fn>;

  function crear(query: Params = {}): Resumen {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
    });
    const c = TestBed.createComponent(Resumen).componentInstance;
    c.ngOnInit();
    return c;
  }

  /** Últimos parámetros escritos en la URL. */
  function url(): Params {
    return navegar.mock.calls.at(-1)![1].queryParams as Params;
  }

  beforeEach(() => {
    service = {
      obtener: vi.fn((desde: string, hasta: string) => of(datos(desde, hasta))),
      movimientos: vi.fn(() => of(PAGINA)),
    };
    navegar = vi.fn(() => Promise.resolve(true));
    TestBed.configureTestingModule({
      imports: [Resumen],
      providers: [
        { provide: ResumenService, useValue: service },
        { provide: Router, useValue: { navigate: navegar } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });
  });

  it('sin parámetros muestra hoy y no deja nada en la URL', () => {
    const c = crear();
    expect(c.periodo()).toBe('hoy');
    expect(service.obtener).toHaveBeenCalledWith(c.fechas().desde, c.fechas().desde);
    expect(url()).toMatchObject({ periodo: null, desde: null, hasta: null, pagina: null });
  });

  it('recupera de la URL el rango, los filtros y la página de los movimientos', () => {
    crear({
      periodo: 'rango',
      desde: '2026-10-01',
      hasta: '2026-10-05',
      tipo: 'GASTO',
      metodo: 'NEQUI',
      pagina: '2',
    });
    expect(service.obtener).toHaveBeenCalledWith('2026-10-01', '2026-10-05');
    expect(service.movimientos).toHaveBeenCalledWith(
      '2026-10-01',
      '2026-10-05',
      { tipo: 'GASTO', metodo: 'NEQUI', orden: 'momento,desc' },
      1,
      20,
    );
  });

  it('el rango exige las dos fechas y no acepta "hasta" antes de "desde"', () => {
    const c = crear();
    c.elegir('rango');
    c.rango.setValue({ desde: '', hasta: '' });
    service.obtener.mockClear();
    c.verRango();
    expect(c.errorRango('desde')).toBe('Elige la fecha');
    c.rango.setValue({ desde: '2026-10-10', hasta: '2026-10-01' });
    c.verRango();
    expect(c.errorRango('hasta')).toBe('Antes de "Desde"');
    expect(service.obtener).not.toHaveBeenCalled();

    c.rango.setValue({ desde: '2026-10-01', hasta: '2026-10-10' });
    c.verRango();
    expect(service.obtener).toHaveBeenCalledWith('2026-10-01', '2026-10-10');
    expect(url()).toMatchObject({ periodo: 'rango', desde: '2026-10-01', hasta: '2026-10-10' });
  });

  it('al filtrar vuelve a la primera página y lo deja en la URL; limpiar conserva el orden', () => {
    const c = crear({ pagina: '3' });
    c.filtrarMovimientos({ tipo: 'ABONO', orden: 'momento,asc' });
    expect(service.movimientos).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.any(String),
      { tipo: 'ABONO', metodo: '', orden: 'momento,asc' },
      0,
      20,
    );
    expect(url()).toMatchObject({ tipo: 'ABONO', orden: 'momento,asc', pagina: null });
    c.limpiarFiltrosMov();
    expect(c.filtrosMov()).toEqual({ tipo: '', metodo: '', orden: 'momento,asc' });
  });

  it('un día del desglose abre ese día solo', () => {
    const c = crear({ periodo: 'semana' });
    c.verDia('2026-10-14');
    expect(c.periodo()).toBe('rango');
    expect(service.obtener).toHaveBeenLastCalledWith('2026-10-14', '2026-10-14');
    expect(c.varios()).toBe(false);
  });

  it('mientras carga muestra la misma estructura en $0 con un renglón por día', () => {
    service.obtener.mockReturnValue(of());
    const c = crear({ periodo: 'rango', desde: '2026-10-01', hasta: '2026-10-03' });
    expect(c.esqueleto()).toBe(true);
    expect(c.vista()?.dias.map((d) => d.fecha)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
  });
});
