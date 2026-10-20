import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { Sastreria } from '../../models/sastreria.model';
import { SastreriaService } from '../../services/sastreria.service';
import { ConfiguracionSastreria } from './configuracion';

function sastreria(parcial: Partial<Sastreria> = {}): Sastreria {
  return {
    id: 's1',
    nombre: 'El Buen Corte',
    nit: null,
    direccion: null,
    telefono: null,
    plan: 'DEMO',
    licenciaHasta: null,
    activo: true,
    horaInicioCaja: '05:00',
    horaFinCaja: '23:00',
    ...parcial,
  };
}

describe('ConfiguracionSastreria', () => {
  let service: {
    obtener: ReturnType<typeof vi.fn>;
    actualizar: ReturnType<typeof vi.fn>;
  };
  let componente: ConfiguracionSastreria;

  beforeEach(() => {
    service = {
      obtener: vi.fn(() => of(sastreria())),
      actualizar: vi.fn(() => of(sastreria())),
    };
    TestBed.configureTestingModule({
      imports: [ConfiguracionSastreria],
      providers: [
        provideRouter([]),
        { provide: SastreriaService, useValue: service },
        { provide: AuthService, useValue: { rutaInicial: () => '/inicio' } },
      ],
    });
    componente = TestBed.createComponent(ConfiguracionSastreria).componentInstance;
  });

  it('carga la sastrería y llena el formulario', () => {
    componente.ngOnInit();
    expect(service.obtener).toHaveBeenCalled();
    expect(componente.form.controls.nombre.value).toBe('El Buen Corte');
  });

  it('guarda enviando los opcionales vacíos como null', () => {
    componente.ngOnInit();
    componente.form.patchValue({
      nombre: ' El Buen Corte ',
      nit: '',
      direccion: '  ',
      telefono: '3001112233',
    });

    componente.guardar();

    expect(service.actualizar).toHaveBeenCalledWith({
      nombre: 'El Buen Corte',
      nit: null,
      direccion: null,
      telefono: '3001112233',
      horaInicioCaja: '05:00',
      horaFinCaja: '23:00',
    });
  });

  it('no guarda si el horario del resumen empieza después de cerrar', () => {
    componente.ngOnInit();
    componente.form.patchValue({ horaInicioCaja: '21:00', horaFinCaja: '20:00' });
    componente.guardar();
    expect(componente.horarioInvalido()).toBe(true);
    expect(service.actualizar).not.toHaveBeenCalled();
  });

  it('no guarda si el nombre está vacío', () => {
    componente.ngOnInit();
    componente.form.patchValue({ nombre: '  ', nit: '', direccion: '', telefono: '' });

    componente.guardar();

    expect(service.actualizar).not.toHaveBeenCalled();
  });
});
