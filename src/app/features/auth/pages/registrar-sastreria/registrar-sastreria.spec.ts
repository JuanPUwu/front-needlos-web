import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { RegistrarSastreria } from './registrar-sastreria';

describe('RegistrarSastreria', () => {
  let auth: {
    registrarSastreria: ReturnType<typeof vi.fn>;
    registrarSastreriaGoogle: ReturnType<typeof vi.fn>;
  };
  let router: Router;
  let componente: RegistrarSastreria;

  beforeEach(() => {
    auth = {
      registrarSastreria: vi.fn(() => of({ email: 'ana@ejemplo.com' })),
      registrarSastreriaGoogle: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({
      imports: [RegistrarSastreria],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    componente = TestBed.createComponent(RegistrarSastreria).componentInstance;
    router = TestBed.inject(Router);
  });

  it('con Google exige primero el nombre de la sastreria', () => {
    componente.conGoogle('id-token');

    expect(auth.registrarSastreriaGoogle).not.toHaveBeenCalled();
    expect(componente.error()).toContain('nombre de tu sastrería');
  });

  it('con Google envia solo el token y el nombre', () => {
    componente.nombreSastreria.setValue('  El Buen Corte ');
    componente.conGoogle('id-token');

    expect(auth.registrarSastreriaGoogle).toHaveBeenCalledWith({
      idToken: 'id-token',
      nombreSastreria: 'El Buen Corte',
    });
  });

  it('no envia el formulario si las contrasenas no coinciden', () => {
    componente.nombreSastreria.setValue('El Buen Corte');
    componente.form.setValue({
      nombreAdmin: 'Ana',
      apellidoAdmin: 'Perez',
      numeroDocumento: '123',
      telefono: '',
      email: 'ana@ejemplo.com',
      password: 'Clave123!',
      confirmacion: 'Otra123!',
    });

    componente.enviar();

    expect(auth.registrarSastreria).not.toHaveBeenCalled();
  });

  it('envia los datos limpios y el telefono vacio como null', () => {
    componente.nombreSastreria.setValue('El Buen Corte');
    componente.form.setValue({
      nombreAdmin: ' Ana ',
      apellidoAdmin: 'Perez',
      numeroDocumento: '123',
      telefono: '  ',
      email: 'ana@ejemplo.com',
      password: 'Clave123!',
      confirmacion: 'Clave123!',
    });

    componente.enviar();

    expect(auth.registrarSastreria).toHaveBeenCalledWith({
      nombreSastreria: 'El Buen Corte',
      nombreAdmin: 'Ana',
      apellidoAdmin: 'Perez',
      numeroDocumento: '123',
      telefono: null,
      email: 'ana@ejemplo.com',
      password: 'Clave123!',
    });
  });

  it('al registrarse con correo, va a verificar-correo con el email recibido', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    componente.nombreSastreria.setValue('El Buen Corte');
    componente.form.setValue({
      nombreAdmin: 'Ana',
      apellidoAdmin: 'Perez',
      numeroDocumento: '123',
      telefono: '',
      email: 'ana@ejemplo.com',
      password: 'Clave123!',
      confirmacion: 'Clave123!',
    });

    componente.enviar();

    expect(navigateSpy).toHaveBeenCalledWith(['/verificar-correo'], {
      state: { email: 'ana@ejemplo.com' },
    });
    expect(componente.cargando()).toBe(false);
  });
});
