import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { PermisosService } from '../../../../core/auth/permisos';
import { Cliente } from '../../models/cliente.model';
import { ClienteService } from '../../services/cliente.service';
import { Clientes } from './clientes';

function cliente(parcial: Partial<Cliente> = {}): Cliente {
  return {
    id: 'c1',
    nombre: 'Laura',
    apellido: 'Gómez',
    telefono: '3001234567',
    fechaRegistro: '2026-10-15',
    saldoPendiente: 0,
    version: 3,
    ...parcial,
  };
}

describe('Clientes', () => {
  let service: {
    listar: ReturnType<typeof vi.fn>;
    porTelefono: ReturnType<typeof vi.fn>;
    crear: ReturnType<typeof vi.fn>;
    actualizar: ReturnType<typeof vi.fn>;
    eliminar: ReturnType<typeof vi.fn>;
  };
  const roles = signal<string[]>(['SASTRE']);
  let componente: Clientes;

  const pagina = { contenido: [], pagina: 0, tamano: 20, totalElementos: 0, totalPaginas: 0 };

  beforeEach(() => {
    roles.set(['SASTRE']);
    service = {
      listar: vi.fn(() => of(pagina)),
      porTelefono: vi.fn(() => of(cliente({ id: 'otro', nombre: 'Marta', apellido: 'Ruiz' }))),
      crear: vi.fn(() => of(cliente())),
      actualizar: vi.fn(() => of(cliente())),
      eliminar: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({
      imports: [Clientes],
      providers: [
        { provide: ClienteService, useValue: service },
        { provide: AuthService, useValue: { roles } },
        { provide: PermisosService, useValue: { puede: () => true } },
        provideRouter([]),
      ],
    });
    componente = TestBed.createComponent(Clientes).componentInstance;
  });

  function llenar(telefono = '3001234567'): void {
    componente.form.setValue({ nombre: ' Laura ', apellido: 'Gómez', telefono });
  }

  it('no envía si el formulario es inválido (teléfono obligatorio)', () => {
    componente.form.setValue({ nombre: 'Laura', apellido: 'Gómez', telefono: '' });
    componente.enviar();
    expect(service.crear).not.toHaveBeenCalled();
  });

  it('crea con los datos limpios', () => {
    llenar();
    componente.enviar();

    expect(service.crear).toHaveBeenCalledWith({
      nombre: 'Laura',
      apellido: 'Gómez',
      telefono: '3001234567',
    });
  });

  it('si el teléfono ya es de otro cliente, lo indica en el campo con su nombre', () => {
    service.crear.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { status: 409, code: 'TELEFONO_EN_USO', detail: 'El teléfono ya pertenece.' },
          }),
      ),
    );
    componente.ngOnInit();
    llenar();

    componente.enviar();

    expect(service.porTelefono).toHaveBeenCalledWith('3001234567');
    expect(componente.errorTelefono()).toBe('Ya es de Marta Ruiz');
    expect(componente.errorForm()).toBeNull();

    // Al cambiar el número, el aviso desaparece.
    componente.form.controls.telefono.setValue('3110000000');
    expect(componente.errorTelefono()).toBeNull();
  });

  it('aplica filtros, valida el rango de fechas y los limpia conservando el orden', () => {
    componente.ngOnInit();
    service.listar.mockClear();

    componente.alCambiarOrden('fechaRegistro,desc');
    componente.alCambiarDesde('2026-10-01');
    expect(service.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ orden: 'fechaRegistro,desc', desde: '2026-10-01' }),
      0,
      20,
    );
    expect(componente.hayFiltros()).toBe(true);

    service.listar.mockClear();
    componente.alCambiarHasta('2026-09-01');
    expect(componente.errorFiltros()).not.toBeNull();
    expect(service.listar).not.toHaveBeenCalled();

    componente.limpiarFiltros();
    expect(componente.hayFiltros()).toBe(false);
    expect(componente.errorFiltros()).toBeNull();
    expect(componente.filtros().orden).toBe('fechaRegistro,desc');
  });

  it('al editar, actualiza enviando la versión leída', () => {
    componente.editar(cliente({ id: 'c9', version: 7 }));
    componente.form.controls.nombre.setValue('Laura María');

    componente.enviar();

    expect(service.actualizar).toHaveBeenCalledWith(
      'c9',
      7,
      expect.objectContaining({ nombre: 'Laura María' }),
    );
  });

  it('solo el admin puede eliminar', () => {
    expect(componente.esAdmin()).toBe(false);
    roles.set(['SASTRE_ADMIN']);
    expect(componente.esAdmin()).toBe(true);
  });
});
