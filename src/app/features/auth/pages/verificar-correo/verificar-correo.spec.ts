import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { VerificarCorreo } from './verificar-correo';

describe('VerificarCorreo', () => {
  let auth: { verificarCorreo: ReturnType<typeof vi.fn>; reenviarCodigo: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    auth = {
      verificarCorreo: vi.fn(() => of(undefined)),
      reenviarCodigo: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({
      imports: [VerificarCorreo],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    router = TestBed.inject(Router);
  });

  function crearComponente(email: string | undefined): VerificarCorreo {
    history.pushState(email ? { email } : {}, '');
    return TestBed.createComponent(VerificarCorreo).componentInstance;
  }

  it('sin email en el estado de navegacion, vuelve al registro', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    crearComponente(undefined);

    expect(navigateSpy).toHaveBeenCalledWith(['/registrar-sastreria']);
  });

  it('con un codigo valido, llama a verificarCorreo con el email y el codigo', () => {
    const componente = crearComponente('ana@ejemplo.com');
    componente.form.setValue({ codigo: '123456' });

    componente.enviar();

    expect(auth.verificarCorreo).toHaveBeenCalledWith('ana@ejemplo.com', '123456');
  });

  it('no llama al backend si el codigo no tiene 6 digitos', () => {
    const componente = crearComponente('ana@ejemplo.com');
    componente.form.setValue({ codigo: '123' });

    componente.enviar();

    expect(auth.verificarCorreo).not.toHaveBeenCalled();
  });

  it('reenviar pide un codigo nuevo y muestra la confirmacion', () => {
    const componente = crearComponente('ana@ejemplo.com');

    componente.reenviar();

    expect(auth.reenviarCodigo).toHaveBeenCalledWith('ana@ejemplo.com');
    expect(componente.reenviado()).toBe(true);
    expect(componente.segundosParaReenviar()).toBeGreaterThan(0);
  });
});
