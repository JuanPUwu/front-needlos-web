import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { ConfiguracionSistema } from '../../models/plataforma.model';
import { EstadoSuperAdmin } from '../../services/estado-super-admin';
import { PlataformaService } from '../../services/plataforma.service';
import { SuperAdminConfiguracion } from './configuracion-sistema';

function config(parcial: Partial<ConfiguracionSistema> = {}): ConfiguracionSistema {
  return {
    diasPrueba: 15,
    diasAviso: 7,
    puedeEditar: true,
    actualizadoEn: '2026-10-20T15:00:00Z',
    actualizadoPor: null,
    ...parcial,
  };
}

describe('SuperAdminConfiguracion', () => {
  let service: Record<string, ReturnType<typeof vi.fn>>;
  let confirmar: ReturnType<typeof vi.fn>;

  function crear(): SuperAdminConfiguracion {
    const fixture = TestBed.createComponent(SuperAdminConfiguracion);
    const c = fixture.componentInstance;
    c.ngOnInit();
    TestBed.tick();
    return c;
  }

  beforeEach(() => {
    service = {
      configuracion: vi.fn(() => of(config())),
      guardarConfiguracion: vi.fn(() => of(config({ diasPrueba: 20 }))),
    };
    confirmar = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      imports: [SuperAdminConfiguracion],
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

  it('solo guarda si hay cambios reales y pide confirmar', async () => {
    const c = crear();
    expect(c.hayCambios()).toBe(false);
    await c.guardar();
    expect(confirmar).not.toHaveBeenCalled();

    c.form.controls.diasPrueba.setValue(20);
    expect(c.hayCambios()).toBe(true);
    await c.guardar();
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(service['guardarConfiguracion']).toHaveBeenCalledWith(20, 7);
    expect(c.hayCambios()).toBe(false);
  });

  it('fuera de los límites no se envía', async () => {
    const c = crear();
    c.form.controls.diasAviso.setValue(31);
    await c.guardar();
    expect(service['guardarConfiguracion']).not.toHaveBeenCalled();
  });

  it('un SuperAdmin que no es el principal la ve deshabilitada', () => {
    service['configuracion'].mockReturnValue(of(config({ puedeEditar: false })));
    const c = crear();
    expect(c.puedeEditar()).toBe(false);
    expect(c.form.disabled).toBe(true);
  });
});
