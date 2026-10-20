import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { PermisosService } from '../../../../core/auth/permisos';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { Material } from '../../models/material.model';
import { MaterialService } from '../../services/material.service';
import { Inventario } from './inventario';

function material(parcial: Partial<Material> = {}): Material {
  return {
    id: 'm1',
    nombre: 'Tela azul',
    unidad: 'METRO',
    cantidad: 3,
    stockMinimo: 1,
    stockBajo: false,
    activo: true,
    version: 0,
    ...parcial,
  };
}

const pagina = (n: number) => ({
  contenido: [material()],
  pagina: 0,
  tamano: 20,
  totalElementos: n,
  totalPaginas: 1,
});

describe('Inventario', () => {
  let service: {
    listar: ReturnType<typeof vi.fn>;
    contarStockBajo: ReturnType<typeof vi.fn>;
  };
  let navegar: ReturnType<typeof vi.fn>;
  let puede: boolean;

  function crear(query: Params = {}): Inventario {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: { queryParamMap: convertToParamMap(query) },
        queryParamMap: of(convertToParamMap(query)),
      },
    });
    const c = TestBed.createComponent(Inventario).componentInstance;
    c.ngOnInit();
    return c;
  }

  function url(): Params {
    return navegar.mock.calls.at(-1)![1].queryParams as Params;
  }

  beforeEach(() => {
    puede = true;
    service = {
      listar: vi.fn(() => of(pagina(1))),
      contarStockBajo: vi.fn(() => of(pagina(4))),
    };
    navegar = vi.fn(() => Promise.resolve(true));
    TestBed.configureTestingModule({
      imports: [Inventario],
      providers: [
        { provide: MaterialService, useValue: service },
        { provide: Router, useValue: { navigate: navegar } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: PermisosService, useValue: { puede: () => puede } },
        { provide: Notificaciones, useValue: { exito: vi.fn() } },
      ],
    });
  });

  it('recupera los filtros de la URL y cuenta los de stock bajo', () => {
    const c = crear({ buscar: 'tela', estado: 'TODOS' });
    expect(service.listar).toHaveBeenCalledWith(
      { buscar: 'tela', estado: 'TODOS', stockBajo: false, orden: 'nombre,asc' },
      0,
      20,
    );
    expect(c.conStockBajo()).toBe(4);
  });

  it('el filtro de stock bajo queda en la URL', () => {
    const c = crear();
    c.alCambiarStock('bajo');
    expect(c.filtros().stockBajo).toBe(true);
    expect(url()).toMatchObject({ stockBajo: 'true', pagina: null });
  });

  it('al crear un material abre su popup', () => {
    const c = crear({ nuevo: '1' });
    c.alCambiar({
      material: material({ id: 'nuevo-id' }),
      mensaje: 'Material creado.',
      nuevo: true,
    });
    expect(url()).toMatchObject({ material: 'nuevo-id', nuevo: null });
  });

  it('el botón de nuevo material solo se ofrece con el permiso', () => {
    puede = false;
    const c = crear();
    expect(c.puedeGestionar()).toBe(false);
  });
});
