import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { SastreriaService } from '../../services/sastreria.service';
import { EliminarModal } from './eliminar-modal';

describe('EliminarModal', () => {
  let eliminar: ReturnType<typeof vi.fn>;
  let pedir: ReturnType<typeof vi.fn>;
  let avisar: ReturnType<typeof vi.fn>;
  let cerrarSesion: ReturnType<typeof vi.fn>;
  let modal: EliminarModal;

  function crear(tieneContrasena = true): void {
    eliminar = vi.fn(() => of({ seBorraEl: '2027-01-18T00:00:00Z' }));
    pedir = vi.fn().mockResolvedValue(true);
    avisar = vi.fn().mockResolvedValue(undefined);
    cerrarSesion = vi.fn();
    TestBed.configureTestingModule({
      imports: [EliminarModal],
      providers: [
        { provide: SastreriaService, useValue: { eliminar } },
        {
          provide: AuthService,
          useValue: {
            cerrarSesion,
            autenticado: signal(false),
            sesion: signal({ cuenta: { tieneContrasena } }),
          },
        },
        { provide: Confirmacion, useValue: { pedir, avisar } },
        { provide: Notificaciones, useValue: { info: vi.fn(), exito: vi.fn(), error: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(EliminarModal);
    fixture.componentRef.setInput('sastreria', 'Sastrería Prueba');
    modal = fixture.componentInstance;
  }

  beforeEach(() => crear());

  it('sin la contraseña ni el nombre avisa qué falta y no elimina', async () => {
    await modal.eliminar();
    expect(avisar).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Falta información' }));
    expect(eliminar).not.toHaveBeenCalled();
  });

  it('confirma, elimina y cierra la sesión', async () => {
    modal.form.setValue({ confirmacion: 'Clave123!', nombre: 'Sastrería Prueba' });
    await modal.eliminar();
    expect(pedir).toHaveBeenCalledWith(expect.objectContaining({ peligro: true }));
    expect(eliminar).toHaveBeenCalledWith('Clave123!', 'Sastrería Prueba');
    expect(cerrarSesion).toHaveBeenCalled();
  });

  it('el nombre en minúsculas no coincide: avisa y no elimina', async () => {
    modal.form.setValue({ confirmacion: 'Clave123!', nombre: 'sastrería prueba' });
    await modal.eliminar();
    expect(avisar).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Revisa la información' }),
    );
    expect(eliminar).not.toHaveBeenCalled();
  });

  it('si no confirma, no elimina', async () => {
    pedir.mockResolvedValueOnce(false);
    modal.form.setValue({ confirmacion: 'Clave123!', nombre: 'Sastrería Prueba' });
    await modal.eliminar();
    expect(eliminar).not.toHaveBeenCalled();
  });

  it('cuenta de Google sin contraseña: confirma solo con el nombre de la sastrería', async () => {
    TestBed.resetTestingModule();
    crear(false);
    expect(modal.conContrasena()).toBe(false);
    modal.form.controls.nombre.setValue('Sastrería Prueba');
    await modal.eliminar();
    expect(eliminar).toHaveBeenCalledWith('Sastrería Prueba', 'Sastrería Prueba');
  });
});
