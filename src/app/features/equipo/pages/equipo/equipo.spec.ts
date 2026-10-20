import { TestBed } from '@angular/core/testing';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { Empleado, Invitacion } from '../../models/empleado.model';
import { EmpleadoService } from '../../services/empleado.service';
import { Equipo } from './equipo';

function empleado(parcial: Partial<Empleado> = {}): Empleado {
  return {
    accesoId: 'a1',
    cuentaId: 'c1',
    nombre: 'Ana',
    apellido: 'Pérez',
    email: 'ana@ejemplo.com',
    telefono: null,
    numeroDocumento: null,
    roles: ['SASTRE'],
    permisos: [],
    activo: true,
    ...parcial,
  };
}

function invitacion(parcial: Partial<Invitacion> = {}): Invitacion {
  return {
    id: 'inv-1',
    email: 'nuevo@ejemplo.com',
    nombre: 'Ana',
    apellido: 'Pérez',
    rol: 'SASTRE',
    expira: '',
    creadoEn: '',
    ...parcial,
  };
}

describe('Equipo', () => {
  let service: {
    listar: ReturnType<typeof vi.fn>;
    listarInvitaciones: ReturnType<typeof vi.fn>;
    invitar: ReturnType<typeof vi.fn>;
    actualizar: ReturnType<typeof vi.fn>;
    desactivar: ReturnType<typeof vi.fn>;
    reactivar: ReturnType<typeof vi.fn>;
    reenviarInvitacion: ReturnType<typeof vi.fn>;
    cancelarInvitacion: ReturnType<typeof vi.fn>;
  };
  let componente: Equipo;

  beforeEach(() => {
    service = {
      listar: vi.fn(() => of([])),
      listarInvitaciones: vi.fn(() => of([])),
      invitar: vi.fn(() => of(invitacion())),
      actualizar: vi.fn(() => of(empleado({ roles: ['SASTRE'] }))),
      desactivar: vi.fn(() => of(undefined)),
      reactivar: vi.fn(() => of(undefined)),
      reenviarInvitacion: vi.fn(() => of(undefined)),
      cancelarInvitacion: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({
      imports: [Equipo],
      providers: [
        provideRouter([]),
        { provide: EmpleadoService, useValue: service },
        {
          provide: AuthService,
          useValue: {
            rutaInicial: () => '/inicio',
            roles: () => [],
            autenticado: () => false,
            soporte: () => false,
            sesion: () => null,
          },
        },
      ],
    });
    componente = TestBed.createComponent(Equipo).componentInstance;
  });

  it('no envía si el formulario es inválido', () => {
    componente.enviar();
    expect(service.invitar).not.toHaveBeenCalled();
  });

  it('invita con los datos limpios y el teléfono vacío como null', () => {
    componente.form.setValue({
      nombre: ' Ana ',
      apellido: 'Pérez',
      email: 'nuevo@ejemplo.com',
      telefono: '  ',
      numeroDocumento: '',
      rol: 'SASTRE',
    });

    componente.enviar();

    expect(service.invitar).toHaveBeenCalledWith({
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'nuevo@ejemplo.com',
      telefono: null,
      numeroDocumento: null,
      rol: 'SASTRE',
    });
    // La persona no se agrega como miembro; queda como invitación pendiente.
    expect(componente.empleados().length).toBe(0);
    expect(componente.invitaciones().length).toBe(1);
  });

  it('al editar, envía a actualizar con el accesoId y no invita', () => {
    componente.editar(empleado({ accesoId: 'acc-9', roles: ['SASTRE_ADMIN'] }));
    expect(componente.editando()).toBe(true);

    componente.enviar();

    expect(service.invitar).not.toHaveBeenCalled();
    expect(service.actualizar).toHaveBeenCalledWith(
      'acc-9',
      expect.objectContaining({ nombre: 'Ana', rol: 'SASTRE_ADMIN' }),
    );
  });

  it('al editar un sastre envía sus permisos; a un admin no le envía permisos sueltos', () => {
    componente.editar(empleado({ accesoId: 'acc-1', permisos: ['CREAR_PEDIDOS'] }));
    componente.alternarPermiso('REGISTRAR_ABONOS', true);
    componente.enviar();
    expect(service.actualizar).toHaveBeenLastCalledWith(
      'acc-1',
      expect.objectContaining({ permisos: ['CREAR_PEDIDOS', 'REGISTRAR_ABONOS'] }),
    );

    componente.editar(empleado({ accesoId: 'acc-2', permisos: ['CREAR_PEDIDOS'] }));
    componente.form.controls.rol.setValue('SASTRE_ADMIN');
    componente.enviar();
    expect(service.actualizar).toHaveBeenLastCalledWith(
      'acc-2',
      expect.objectContaining({ rol: 'SASTRE_ADMIN', permisos: [] }),
    );
  });

  it('cancela una invitación pendiente tras confirmar', async () => {
    const inv = invitacion({ id: 'inv-9' });
    componente.invitaciones.set([inv]);
    const pedir = vi.spyOn(TestBed.inject(Confirmacion), 'pedir').mockResolvedValueOnce(false);
    await componente.cancelarInvitacion(inv);
    expect(service.cancelarInvitacion).not.toHaveBeenCalled();

    pedir.mockResolvedValueOnce(true);
    await componente.cancelarInvitacion(inv);

    expect(service.cancelarInvitacion).toHaveBeenCalledWith('inv-9');
    expect(componente.invitaciones().length).toBe(0);
  });

  it('filtra miembros por texto, rol y estado; texto y rol también a invitaciones', () => {
    service.listar.mockReturnValue(
      of([
        empleado({ accesoId: 'a1', nombre: 'Ana', roles: ['SASTRE_ADMIN', 'SASTRE'] }),
        empleado({ accesoId: 'a2', nombre: 'Luis', email: 'luis@x.com', activo: false }),
      ]),
    );
    service.listarInvitaciones.mockReturnValue(
      of([invitacion({ id: 'i1', nombre: 'Marta', rol: 'SASTRE' })]),
    );
    componente.ngOnInit();

    componente.alCambiarRol('SASTRE_ADMIN');
    expect(componente.miembrosVisibles().map((e) => e.accesoId)).toEqual(['a1']);
    expect(componente.invitacionesVisibles().length).toBe(0);

    componente.limpiarFiltros();
    componente.alCambiarEstado('inactivos');
    expect(componente.miembrosVisibles().map((e) => e.accesoId)).toEqual(['a2']);
    expect(componente.invitacionesVisibles().length).toBe(1);

    componente.limpiarFiltros();
    componente.alBuscar('LUIS@');
    expect(componente.miembrosVisibles().map((e) => e.accesoId)).toEqual(['a2']);
    expect(componente.hayFiltros()).toBe(true);
  });
});
