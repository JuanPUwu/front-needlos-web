import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PermisosService } from '../../../../core/auth/permisos';
import { ClienteService } from '../../../clientes/services/cliente.service';
import { EmpleadoService } from '../../../equipo/services/empleado.service';
import { PedidoService } from '../../services/pedido.service';
import { Pedidos } from './pedidos';

describe('Pedidos', () => {
  let service: { listar: ReturnType<typeof vi.fn>; resumen: ReturnType<typeof vi.fn> };

  function crear(query: Record<string, string> = {}): Pedidos {
    TestBed.configureTestingModule({
      imports: [Pedidos],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
        },
        { provide: PedidoService, useValue: service },
        { provide: EmpleadoService, useValue: { asignables: () => of([]) } },
        {
          provide: ClienteService,
          useValue: { obtener: () => of({ id: 'c1', saldoPendiente: 27000 }) },
        },
        {
          provide: PermisosService,
          useValue: { puede: () => true, accesoId: () => 'yo' },
        },
      ],
    });
    const c = TestBed.createComponent(Pedidos).componentInstance;
    c.ngOnInit();
    return c;
  }

  beforeEach(() => {
    service = {
      listar: vi.fn(() =>
        of({ contenido: [], pagina: 0, tamano: 20, totalElementos: 0, totalPaginas: 0 }),
      ),
      resumen: vi.fn(() =>
        of({ enProceso: 1, listosParaEntregar: 0, vencidos: 0, paraEntregarHoy: 0 }),
      ),
    };
  });

  it('llega filtrado por cliente desde Clientes', () => {
    const c = crear({ clienteId: 'c1', cliente: 'Laura Gómez' });
    expect(c.clienteFiltrado()).toBe('Laura Gómez');
    expect(c.saldoCliente()).toBe(27000);
    expect(service.listar).toHaveBeenCalledWith(
      expect.objectContaining({ clienteId: 'c1' }),
      0,
      20,
    );
  });

  it('los tiles aplican filtros rápidos y "Mis prendas" usa mi acceso', () => {
    const c = crear();
    c.atajo('vencidos');
    expect(service.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ vencidos: true, estado: '' }),
      0,
      20,
    );
    c.atajo('listos');
    expect(c.filtros().estado).toBe('FINALIZADO');
    expect(c.filtros().vencidos).toBe(false);

    c.atajo('hoy');
    expect(c.filtros().sinEntregar).toBe(true);
    expect(c.filtros().entregaDesde).toBe(c.filtros().entregaHasta);

    c.alCambiarSastre('mias');
    expect(c.filtros().sastreId).toBe('yo');

    c.limpiarFiltros();
    expect(c.hayFiltros()).toBe(false);
  });
});
