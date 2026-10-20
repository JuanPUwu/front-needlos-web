import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { SuperAdmins } from '../../models/plataforma.model';
import { PlataformaService } from '../../services/plataforma.service';
import { EstadoSuperAdmin } from '../../services/estado-super-admin';
import { SuperAdminSuperAdmins } from './superadmins';

const DATOS: SuperAdmins = {
  soyPrincipal: true,
  superAdmins: [
    { id: 'p', nombre: 'Pablo', apellido: 'R', email: 'p@x.com', principal: true },
    { id: 'o', nombre: 'Laura', apellido: 'G', email: 'l@x.com', principal: false },
  ],
  invitaciones: [
    { id: 'i1', email: 'n@x.com', nombre: 'Nora', apellido: 'M', expira: '2026-10-22T05:00:00Z' },
  ],
};

describe('SuperAdminSuperAdmins', () => {
  let service: Record<string, ReturnType<typeof vi.fn>>;
  let confirmar: ReturnType<typeof vi.fn>;

  function crear(): SuperAdminSuperAdmins {
    const c = TestBed.createComponent(SuperAdminSuperAdmins).componentInstance;
    c.ngOnInit();
    return c;
  }

  beforeEach(() => {
    service = {
      superAdmins: vi.fn(() => of(DATOS)),
      invitarSuperAdmin: vi.fn(() => of(undefined)),
      cancelarInvitacion: vi.fn(() => of(undefined)),
      eliminarSuperAdmin: vi.fn(() => of(undefined)),
    };
    confirmar = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      imports: [SuperAdminSuperAdmins],
      providers: [
        { provide: PlataformaService, useValue: service },
        {
          provide: Confirmacion,
          useValue: { pedir: confirmar, avisar: vi.fn().mockResolvedValue(undefined) },
        },
        { provide: Notificaciones, useValue: { exito: vi.fn() } },
        { provide: EstadoSuperAdmin, useValue: { principal: signal(true) } },
      ],
    });
  });

  it('invita con los datos limpios y recarga la lista', () => {
    const c = crear();
    c.invitar();
    expect(service['invitarSuperAdmin']).not.toHaveBeenCalled();

    c.form.setValue({ nombre: ' Ana ', apellido: 'Ruiz', email: 'ana@x.com' });
    c.invitar();
    expect(service['invitarSuperAdmin']).toHaveBeenCalledWith({
      nombre: 'Ana',
      apellido: 'Ruiz',
      email: 'ana@x.com',
    });
    expect(service['superAdmins']).toHaveBeenCalledTimes(2);
    expect(c.form.getRawValue().email).toBe('');
  });

  it('un correo con cuenta muestra el error en la línea del título del formulario', () => {
    service['invitarSuperAdmin'].mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { code: 'CORREO_EN_USO', message: 'Ese correo ya tiene una cuenta.' },
          }),
      ),
    );
    const c = crear();
    c.form.setValue({ nombre: 'Ana', apellido: 'Ruiz', email: 'ana@x.com' });
    c.invitar();
    expect(c.errorInvitar()).toBeTruthy();
    expect(c.error()).toBeNull();
  });

  it('eliminar y cancelar piden confirmación', async () => {
    const c = crear();
    confirmar.mockResolvedValueOnce(false);
    await c.eliminar(DATOS.superAdmins[1]);
    expect(service['eliminarSuperAdmin']).not.toHaveBeenCalled();

    await c.eliminar(DATOS.superAdmins[1]);
    expect(service['eliminarSuperAdmin']).toHaveBeenCalledWith('o');
    await c.cancelarInvitacion(DATOS.invitaciones[0]);
    expect(service['cancelarInvitacion']).toHaveBeenCalledWith('i1');
  });

  it('mientras carga, el esqueleto toma la forma del principal recordado', () => {
    service['superAdmins'].mockReturnValue(new Subject());
    const c = crear();
    expect(c.datos()).toBeNull();
    expect(c.vista().soyPrincipal).toBe(true);
  });
});
