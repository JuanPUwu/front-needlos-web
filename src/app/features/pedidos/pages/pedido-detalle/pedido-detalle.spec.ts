import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PermisosService } from '../../../../core/auth/permisos';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { Confirmacion } from '../../../../core/ui/confirmacion';
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
        { provide: PedidoService, useValue: service },
        { provide: EmpleadoService, useValue: { asignables: () => of([]) } },
        { provide: PermisosService, useValue: { puede: () => true, admin: () => true } },
        {
          provide: Notificaciones,
          useValue: { error: vi.fn(), exito: vi.fn(), info: vi.fn() },
        },
      ],
    });
    const fixture = TestBed.createComponent(PedidoDetalle);
    fixture.componentRef.setInput('pedidoId', 'p1');
    componente = fixture.componentInstance;
    componente.ngOnInit();
  });

  it('entregar siempre pide confirmar; si queda saldo lo avisa', async () => {
    const confirmacion = TestBed.inject(Confirmacion);
    const pedir = vi.spyOn(confirmacion, 'pedir').mockResolvedValueOnce(false);
    await componente.entregar(['pr1']);
    expect(pedir).toHaveBeenCalledWith(
      expect.objectContaining({ mensaje: expect.stringContaining('saldo pendiente') }),
    );
    expect(service['entregar']).not.toHaveBeenCalled();

    pedir.mockResolvedValueOnce(true);
    await componente.entregar(['pr1']);
    expect(service['entregar']).toHaveBeenCalledWith('p1', ['pr1']);
    expect(componente.pedido()?.estado).toBe('ENTREGADO');
  });

  it('sin saldo también confirma, pero sin aviso de saldo', async () => {
    componente.pedido.set(pedido({ saldo: 0 }));
    const pedir = vi.spyOn(TestBed.inject(Confirmacion), 'pedir').mockResolvedValue(true);
    await componente.entregar(['pr1']);
    expect(pedir.mock.calls[0][0].mensaje).not.toContain('saldo');
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

  it('si falta el monto o la razón, avisa qué falta en un popup y no lo envía', () => {
    const avisar = vi.spyOn(TestBed.inject(Confirmacion), 'avisar').mockResolvedValue();
    componente.registrarAbono();
    expect(avisar).toHaveBeenCalledWith(
      expect.objectContaining({ mensaje: 'Para registrar el abono falta el monto.' }),
    );
    expect(service['registrarAbono']).not.toHaveBeenCalled();

    componente.pedirAnular();
    componente.anular();
    expect(avisar).toHaveBeenCalledWith(
      expect.objectContaining({ mensaje: 'Para anular el pedido falta la razón.' }),
    );
  });
});
