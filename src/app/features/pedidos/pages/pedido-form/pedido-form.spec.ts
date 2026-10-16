import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PermisosService } from '../../../../core/auth/permisos';
import { TipoPrendaService } from '../../../catalogo/services/tipo-prenda.service';
import { ClienteService } from '../../../clientes/services/cliente.service';
import { EmpleadoService } from '../../../equipo/services/empleado.service';
import { PedidoService } from '../../services/pedido.service';
import { PedidoForm } from './pedido-form';

function noEncontrado(): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 404,
    error: { status: 404, code: 'CLIENTE_NO_ENCONTRADO', detail: 'No hay un cliente.' },
  });
}

describe('PedidoForm (nuevo)', () => {
  let pedidos: { crear: ReturnType<typeof vi.fn>; obtener: ReturnType<typeof vi.fn> };
  let clientes: { porTelefono: ReturnType<typeof vi.fn> };
  let tipos: { listar: ReturnType<typeof vi.fn>; precioSugerido: ReturnType<typeof vi.fn> };
  let componente: PedidoForm;

  beforeEach(() => {
    vi.useFakeTimers();
    pedidos = {
      crear: vi.fn(() => of({ id: 'p1' })),
      obtener: vi.fn(),
    };
    clientes = { porTelefono: vi.fn(() => throwError(noEncontrado)) };
    tipos = {
      listar: vi.fn(() =>
        of([{ id: 't1', nombre: 'Camisa', precioBase: null, activo: true, version: 0 }]),
      ),
      precioSugerido: vi.fn(() => of({ precio: 25000, origen: 'HISTORICO' })),
    };
    TestBed.configureTestingModule({
      imports: [PedidoForm],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
        { provide: PedidoService, useValue: pedidos },
        { provide: ClienteService, useValue: clientes },
        { provide: TipoPrendaService, useValue: tipos },
        { provide: EmpleadoService, useValue: { asignables: () => of([]) } },
        { provide: PermisosService, useValue: { puede: () => true } },
      ],
    });
    componente = TestBed.createComponent(PedidoForm).componentInstance;
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    componente.ngOnInit();
  });

  afterEach(() => vi.useRealTimers());

  function llenarPrenda(precio = '20000'): void {
    componente.filas.at(0).patchValue({
      tipoPrendaId: 't1',
      cantidad: 2,
      descripcion: 'Ajuste de mangas',
      precio,
    });
    componente.form.controls.fechaEntrega.setValue('2099-01-01');
  }

  it('si el teléfono ya es de un cliente, rellena sus datos y envía su id', () => {
    clientes.porTelefono.mockReturnValue(
      of({ id: 'c1', nombre: 'Laura', apellido: 'Gómez', telefono: '3001234567' }),
    );
    componente.form.controls.telefono.setValue('3001234567');
    vi.advanceTimersByTime(300);

    expect(componente.form.controls.nombre.value).toBe('Laura');
    expect(componente.form.controls.nombre.disabled).toBe(true);

    llenarPrenda();
    componente.enviar();
    expect(pedidos.crear).toHaveBeenCalledWith(
      expect.objectContaining({ clienteId: 'c1', clienteNuevo: null }),
      expect.any(String),
    );
  });

  it('si el teléfono no existe, crea el cliente junto con el pedido', () => {
    componente.form.controls.telefono.setValue('3110000000');
    vi.advanceTimersByTime(300);
    expect(componente.telefonoConsultado()).toBe(true);
    expect(componente.form.controls.nombre.enabled).toBe(true);

    componente.form.patchValue({ nombre: 'Pedro', apellido: 'Ruiz' });
    llenarPrenda();
    componente.enviar();
    expect(pedidos.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: null,
        clienteNuevo: { nombre: 'Pedro', apellido: 'Ruiz', telefono: '3110000000' },
      }),
      expect.any(String),
    );
  });

  it('calcula el total en vivo y no deja un abono mayor que el total', () => {
    componente.form.controls.telefono.setValue('3110000000');
    vi.advanceTimersByTime(300);
    componente.form.patchValue({ nombre: 'Pedro', apellido: 'Ruiz', descuento: '5000' });
    llenarPrenda('20000');
    expect(componente.subtotal()).toBe(40000);
    expect(componente.total()).toBe(35000);

    componente.form.controls.abonoMonto.setValue('40000');
    expect(componente.abonoInvalido()).toBe(true);
    componente.enviar();
    expect(pedidos.crear).not.toHaveBeenCalled();

    componente.form.controls.abonoMonto.setValue('10000');
    expect(componente.saldo()).toBe(25000);
    componente.enviar();
    expect(pedidos.crear).toHaveBeenCalledWith(
      expect.objectContaining({ abonoInicial: { monto: 10000, metodo: 'EFECTIVO' } }),
      expect.any(String),
    );
  });

  it('al reintentar tras un error usa la misma clave (no duplica el pedido)', () => {
    pedidos.crear.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
    componente.form.controls.telefono.setValue('3110000000');
    vi.advanceTimersByTime(300);
    componente.form.patchValue({ nombre: 'Pedro', apellido: 'Ruiz' });
    llenarPrenda();

    componente.enviar();
    componente.enviar();
    const [, clave1] = pedidos.crear.mock.calls[0];
    const [, clave2] = pedidos.crear.mock.calls[1];
    expect(clave1).toBe(clave2);
  });

  it('precarga el precio sugerido al elegir el tipo', () => {
    const fila = componente.filas.at(0);
    fila.controls.tipoPrendaId.setValue('t1');
    componente.alCambiarTipo(fila);
    expect(fila.controls.precio.value).toBe('25000');
  });
});
