import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
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
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(query) },
            queryParamMap: of(convertToParamMap(query)),
          },
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
        of({
          enProceso: 1,
          listosParaEntregar: 0,
          entregados: 0,
          anulados: 0,
          total: 1,
          vencidos: 0,
          paraEntregarHoy: 0,
        }),
      ),
    };
  });

  it('llega filtrado por cliente desde Clientes', () => {
    const c = crear({ clienteId: 'c1', cliente: 'Laura Gómez' });
    expect(c.clienteFiltrado()).toBe('Laura Gómez');
    expect(c.saldoCliente()).toBe(27000);
    expect(service.listar).toHaveBeenCalledWith(
      expect.objectContaining({ clienteId: 'c1', estado: '' }),
      0,
      20,
    );
  });

  it('arranca en "En proceso"; las pestañas cambian el estado y los avisos muestran todos', () => {
    const c = crear();
    expect(service.listar).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'EN_PROCESO' }),
      0,
      20,
    );

    c.elegirEstado('FINALIZADO');
    expect(c.filtros().estado).toBe('FINALIZADO');

    c.alCambiarVencidos(true);
    expect(service.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ vencidos: true, estado: 'FINALIZADO' }),
      0,
      20,
    );

    // "Para hoy" es un filtro: entrega desde y hasta hoy; se quita al desmarcarlo.
    c.alCambiarParaHoy(true);
    expect(c.esParaHoy()).toBe(true);
    expect(c.filtros().entregaDesde).toBe(c.filtros().entregaHasta);
    c.alCambiarParaHoy(false);
    expect(c.filtros().entregaDesde).toBe('');

    c.elegirEstado('ENTREGADO');
    c.alCambiarSastre('mias');
    // "Mis prendas" se recuerda como 'mias' y se consulta con mi acceso.
    expect(c.filtros().sastreId).toBe('mias');
    expect(service.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ sastreId: 'yo' }),
      0,
      20,
    );
    expect(c.cantidadFiltros()).toBeGreaterThan(0);

    // Limpiar conserva la pestaña elegida.
    c.limpiarFiltros();
    expect(c.hayFiltros()).toBe(false);
    expect(c.filtros().estado).toBe('ENTREGADO');
  });

  it('abre el popup del pedido que llega en ?pedido=', () => {
    const c = crear({ pedido: 'p9', modo: 'editar' });
    expect(c.pedidoAbierto()).toBe('p9');
    expect(c.pedidoEditando()).toBe(true);
  });

  it('recupera pestaña, filtros y página desde la URL (recarga)', () => {
    crear({ estado: 'ENTREGADO', conSaldo: 'true', buscar: 'ana', pagina: '3' });
    expect(service.listar).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'ENTREGADO', conSaldo: true, buscar: 'ana' }),
      2,
      20,
    );
  });

  it('abre "Nuevo pedido" en popup con ?nuevo=1 y el botón Buscar busca sin esperar', () => {
    const c = crear({ nuevo: '1' });
    expect(c.creando()).toBe(true);

    c.buscarAhora('  ana ');
    expect(service.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ buscar: 'ana' }),
      0,
      20,
    );
  });

  it('al crear un pedido el popup se cierra solo (no abre el detalle) y la lista se recarga', () => {
    const c = crear({ nuevo: '1' });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    service.listar.mockClear();
    c.alCrear({ id: 'p9', numero: '#9-1' } as never);
    expect(navegar).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ nuevo: null, pedido: null }),
      }),
    );
    expect(service.listar).toHaveBeenCalled();
  });
});
