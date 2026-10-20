import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { Material } from '../../models/material.model';
import { MaterialService } from '../../services/material.service';
import { MaterialModal } from './material-modal';

function material(parcial: Partial<Material> = {}): Material {
  return {
    id: 'm1',
    nombre: 'Tela azul',
    unidad: 'METRO',
    cantidad: 3,
    stockMinimo: 1,
    stockBajo: false,
    activo: true,
    version: 2,
    ...parcial,
  };
}

const HISTORIAL = { contenido: [], pagina: 0, tamano: 10, totalElementos: 0, totalPaginas: 0 };

describe('MaterialModal', () => {
  let service: {
    obtener: ReturnType<typeof vi.fn>;
    historial: ReturnType<typeof vi.fn>;
    crear: ReturnType<typeof vi.fn>;
    actualizar: ReturnType<typeof vi.fn>;
    mover: ReturnType<typeof vi.fn>;
    desactivar: ReturnType<typeof vi.fn>;
    reactivar: ReturnType<typeof vi.fn>;
  };
  let confirmar: ReturnType<typeof vi.fn>;

  function crear(id: string | null, puedeGestionar = true): MaterialModal {
    const fixture = TestBed.createComponent(MaterialModal);
    fixture.componentRef.setInput('materialId', id);
    fixture.componentRef.setInput('puedeGestionar', puedeGestionar);
    const c = fixture.componentInstance;
    c.ngOnInit();
    fixture.detectChanges();
    return c;
  }

  beforeEach(() => {
    service = {
      obtener: vi.fn(() => of(material())),
      historial: vi.fn(() => of(HISTORIAL)),
      crear: vi.fn(() => of(material())),
      actualizar: vi.fn(() => of(material({ version: 3 }))),
      mover: vi.fn(() => of(material({ cantidad: 1 }))),
      desactivar: vi.fn(() => of(material({ activo: false }))),
      reactivar: vi.fn(() => of(material())),
    };
    confirmar = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      imports: [MaterialModal],
      providers: [
        { provide: MaterialService, useValue: service },
        {
          provide: Confirmacion,
          useValue: { pedir: confirmar, avisar: vi.fn().mockResolvedValue(undefined) },
        },
      ],
    });
  });

  it('crea con la cantidad inicial (con coma decimal) y avisa que es nuevo', () => {
    const c = crear(null);
    const cambios: unknown[] = [];
    c.cambiado.subscribe((x) => cambios.push(x));
    c.datos.setValue({
      nombre: ' Tela azul ',
      unidad: 'METRO',
      stockMinimo: '1',
      cantidadInicial: '2,5',
    });
    c.guardarDatos();
    expect(service.crear).toHaveBeenCalledWith({
      nombre: 'Tela azul',
      unidad: 'METRO',
      stockMinimo: 1,
      cantidadInicial: 2.5,
    });
    expect(cambios).toEqual([
      expect.objectContaining({ nuevo: true, mensaje: 'Material creado.' }),
    ]);
  });

  it('no registra una salida mayor a lo que hay', () => {
    const c = crear('m1');
    c.elegirTipo('SALIDA');
    c.movimiento.patchValue({ cantidad: '5', razon: 'Pedido #12' });
    c.registrarMovimiento();
    expect(c.errorCantidad()).toBe('No hay tanto');
    expect(service.mover).not.toHaveBeenCalled();
  });

  it('al reintentar un movimiento usa la misma clave (no lo repite) y muestra lo que quedará', () => {
    const c = crear('m1');
    service.mover.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
    c.elegirTipo('SALIDA');
    c.movimiento.patchValue({ cantidad: '2', razon: 'Pedido #12' });
    expect(c.quedaria()).toBe(1);
    c.registrarMovimiento();
    c.registrarMovimiento();
    const claves = service.mover.mock.calls.map((llamada) => llamada[2]);
    expect(claves[0]).toBe(claves[1]);
    expect(service.mover).toHaveBeenLastCalledWith(
      'm1',
      { tipo: 'SALIDA', cantidad: 2, razon: 'Pedido #12' },
      claves[0],
    );
    expect(c.movimiento.controls.cantidad.value).toBe('');
  });

  it('pide confirmar antes de desactivar', async () => {
    const c = crear('m1');
    confirmar.mockResolvedValueOnce(false);
    await c.cambiarEstado();
    expect(service.desactivar).not.toHaveBeenCalled();
    await c.cambiarEstado();
    expect(service.desactivar).toHaveBeenCalledWith('m1');
  });

  it('sin permiso todo es de solo lectura', () => {
    const c = crear('m1', false);
    expect(c.datos.disabled).toBe(true);
    expect(c.movimiento.disabled).toBe(true);
  });

  it('cerrar sin haber escrito nada no pide confirmar', async () => {
    const c = crear('m1');
    const cerrados: unknown[] = [];
    c.cerrado.subscribe(() => cerrados.push(true));
    c.elegirTipo('SALIDA');
    await c.cerrar();
    expect(confirmar).not.toHaveBeenCalled();
    expect(cerrados).toHaveLength(1);

    c.movimiento.patchValue({ razon: 'Pedido' });
    await c.cerrar();
    expect(confirmar).toHaveBeenCalledTimes(1);
  });
});
