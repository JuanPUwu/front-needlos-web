import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PermisosService } from '../../../../core/auth/permisos';
import { Memoria } from '../../../../core/estado/memoria';
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

  it('guarda el borrador mientras se escribe y lo recupera al recargar (con la misma clave)', () => {
    componente.form.controls.telefono.setValue('3001234567');
    llenarPrenda();
    llenarPrenda('15000');
    componente.form.markAsDirty();
    componente.form.updateValueAndValidity();
    // La búsqueda del teléfono (300 ms) reinicia la espera del guardado (400 ms).
    vi.advanceTimersByTime(1000);

    const guardado = TestBed.inject(Memoria).leer<{ clave: string }>('pedido-nuevo');
    expect(guardado).not.toBeNull();

    // "Recarga": un formulario nuevo recupera las dos prendas y la clave anti-duplicados.
    const otro = TestBed.createComponent(PedidoForm).componentInstance;
    otro.ngOnInit();
    expect(otro.filas.length).toBe(2);
    expect(otro.form.controls.telefono.value).toBe('3001234567');

    otro.descartarBorrador();
    expect(otro.filas.length).toBe(0);
    expect(TestBed.inject(Memoria).leer('pedido-nuevo')).toBeNull();
  });

  /** Agrega una prenda con la línea de captura ("Agregar a la lista"). */
  function llenarPrenda(precio = '20000'): void {
    componente.linea.setValue({
      tipoPrendaId: 't1',
      cantidad: 2,
      descripcion: 'Ajuste de mangas',
      precio,
    });
    componente.agregarALista();
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

  it('precarga el precio sugerido al elegir el producto', () => {
    componente.linea.controls.tipoPrendaId.setValue('t1');
    componente.alCambiarTipo();
    expect(componente.linea.controls.precio.value).toBe('25000');
  });

  it('agrega, edita y quita prendas de la lista; no envía sin prendas', () => {
    componente.form.controls.telefono.setValue('3110000000');
    vi.advanceTimersByTime(300);
    componente.form.patchValue({ nombre: 'Pedro', apellido: 'Ruiz', fechaEntrega: '2099-01-01' });

    componente.enviar();
    expect(componente.sinPrendas()).toBe(true);
    expect(pedidos.crear).not.toHaveBeenCalled();

    // Una línea incompleta no se agrega.
    componente.agregarALista();
    expect(componente.filas.length).toBe(0);

    llenarPrenda('10000');
    llenarPrenda('12000');
    expect(componente.filas.length).toBe(2);
    expect(componente.piezas()).toBe(4);

    componente.editarLinea(0);
    componente.linea.controls.cantidad.setValue(5);
    componente.agregarALista();
    expect(componente.filas.at(0).getRawValue().cantidad).toBe(5);
    expect(componente.editandoLinea()).toBeNull();

    componente.quitarPrenda(1);
    expect(componente.filas.length).toBe(1);
    expect(componente.subtotal()).toBe(50000);
  });

  it('el designado se asigna a todas las prendas', () => {
    componente.form.controls.telefono.setValue('3110000000');
    vi.advanceTimersByTime(300);
    componente.form.patchValue({ nombre: 'Pedro', apellido: 'Ruiz', designado: 's9' });
    llenarPrenda();
    llenarPrenda();
    componente.enviar();
    const [req] = pedidos.crear.mock.calls[0];
    expect(req.prendas.map((p: { sastreId: string }) => p.sastreId)).toEqual(['s9', 's9']);
  });

  it('la tarjeta de designado muestra iniciales del sastre, o la silueta si no hay nadie', () => {
    expect(componente.designadoActual()).toEqual({
      nombre: 'Sin asignar',
      iniciales: null,
      varios: false,
    });
    componente.sastres.set([{ accesoId: 's9', nombre: 'María  José Pérez' }]);
    componente.form.controls.designado.setValue('s9');
    expect(componente.designadoActual().iniciales).toBe('MJ');
    componente.form.controls.designado.setValue(componente.varios);
    expect(componente.designadoActual().varios).toBe(true);
  });
});
