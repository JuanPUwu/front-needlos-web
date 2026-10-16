import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PermisosService } from '../../../../core/auth/permisos';
import { EmpleadoService } from '../../../equipo/services/empleado.service';
import { Pedido, Prenda } from '../../models/pedido.model';
import { PedidoService } from '../../services/pedido.service';
import { PedidoDetalle } from './pedido-detalle';

function prenda(parcial: Partial<Prenda> = {}): Prenda {
  return {
    id: 'pr1',
    tipoPrendaId: 't1',
    tipoPrenda: 'Camisa',
    sastreId: null,
    sastre: null,
    cantidad: 1,
    descripcion: 'Ajuste',
    precioUnitario: 30000,
    subtotal: 30000,
    estado: 'FINALIZADO',
    historial: [],
    ...parcial,
  };
}

function pedido(parcial: Partial<Pedido> = {}): Pedido {
  return {
    id: 'p1',
    numero: '#5-1',
    numeroGlobal: 5,
    numeroLocal: 1,
    cliente: { id: 'c1', nombre: 'Laura', apellido: 'Gómez', telefono: '3001234567' },
    fecha: '2026-10-15',
    fechaEntrega: '2026-10-20',
    estado: 'FINALIZADO',
    subtotal: 30000,
    descuento: 0,
    total: 30000,
    abonado: 10000,
    saldo: 20000,
    pagado: false,
    vencido: false,
    razonAnulacion: null,
    prendas: [prenda()],
    abonos: [],
    version: 0,
    ...parcial,
  };
}

describe('PedidoDetalle', () => {
  let service: Record<string, ReturnType<typeof vi.fn>>;
  let componente: PedidoDetalle;

  beforeEach(() => {
    service = {
      obtener: vi.fn(() => of(pedido())),
      entregar: vi.fn(() => of(pedido({ estado: 'ENTREGADO' }))),
      registrarAbono: vi.fn(() => of(pedido({ saldo: 0, abonado: 30000, pagado: true }))),
      cambiarEstado: vi.fn(() => of(pedido())),
    };
    TestBed.configureTestingModule({
      imports: [PedidoDetalle],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'p1' }) } },
        },
        { provide: PedidoService, useValue: service },
        { provide: EmpleadoService, useValue: { asignables: () => of([]) } },
        { provide: PermisosService, useValue: { puede: () => true, admin: () => true } },
      ],
    });
    componente = TestBed.createComponent(PedidoDetalle).componentInstance;
    componente.ngOnInit();
  });

  it('si queda saldo, pide confirmar antes de entregar', () => {
    componente.entregar(['pr1']);
    expect(service['entregar']).not.toHaveBeenCalled();
    expect(componente.confirmarEntrega()).toEqual(['pr1']);

    componente.entregar(['pr1']);
    expect(service['entregar']).toHaveBeenCalledWith('p1', ['pr1']);
    expect(componente.pedido()?.estado).toBe('ENTREGADO');
  });

  it('sin saldo entrega directo', () => {
    componente.pedido.set(pedido({ saldo: 0 }));
    componente.entregar(['pr1']);
    expect(service['entregar']).toHaveBeenCalled();
  });

  it('no registra un abono mayor que el saldo; "Todo el saldo" lo completa', () => {
    componente.formAbono.controls.monto.setValue('25000');
    componente.registrarAbono();
    expect(service['registrarAbono']).not.toHaveBeenCalled();

    componente.pagarSaldo();
    componente.registrarAbono();
    expect(service['registrarAbono']).toHaveBeenCalledWith(
      'p1',
      { monto: 20000, metodo: 'EFECTIVO' },
      expect.any(String),
    );
    expect(componente.pedido()?.pagado).toBe(true);
  });
});
