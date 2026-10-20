import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { PlataformaService } from '../../services/plataforma.service';
import { SuperAdminRegistro } from './registro';

describe('SuperAdminRegistro', () => {
  let acciones: ReturnType<typeof vi.fn>;

  function crear(query: Record<string, string> = {}): SuperAdminRegistro {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
    });
    const c = TestBed.createComponent(SuperAdminRegistro).componentInstance;
    c.ngOnInit();
    return c;
  }

  beforeEach(() => {
    acciones = vi.fn(() =>
      of({ contenido: [], pagina: 0, tamano: 20, totalElementos: 0, totalPaginas: 0 }),
    );
    TestBed.configureTestingModule({
      imports: [SuperAdminRegistro],
      providers: [
        { provide: PlataformaService, useValue: { acciones } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
  });

  it('lee los filtros de la URL y los envía', () => {
    crear({ accion: 'SOPORTE_INICIADO', desde: '2026-10-01' });
    expect(acciones).toHaveBeenCalledWith(0, 20, undefined, {
      buscar: '',
      accion: 'SOPORTE_INICIADO',
      desde: '2026-10-01',
      hasta: '',
    });
  });

  it('un rango al revés muestra el error y no consulta', () => {
    const c = crear();
    c.alCambiarDesde('2026-10-20');
    acciones.mockClear();
    c.alCambiarHasta('2026-10-01');
    expect(c.error()).toContain('Desde');
    expect(acciones).not.toHaveBeenCalled();
  });
});
