import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RecuperacionContrasenaService } from '../../services/recuperacion-contrasena.service';
import { RecuperarContrasena } from './recuperar-contrasena';

describe('RecuperarContrasena', () => {
  let recuperacion: { solicitar: ReturnType<typeof vi.fn> };
  let componente: RecuperarContrasena;

  beforeEach(() => {
    recuperacion = { solicitar: vi.fn(() => of(undefined)) };
    TestBed.configureTestingModule({
      imports: [RecuperarContrasena],
      providers: [
        provideRouter([]),
        { provide: RecuperacionContrasenaService, useValue: recuperacion },
      ],
    });
    componente = TestBed.createComponent(RecuperarContrasena).componentInstance;
  });

  it('no envia un correo invalido', () => {
    componente.form.setValue({ email: 'no-es-correo' });

    componente.enviar();

    expect(recuperacion.solicitar).not.toHaveBeenCalled();
  });

  it('envia el correo y muestra el mensaje generico', () => {
    componente.form.setValue({ email: 'ana@ejemplo.com' });

    componente.enviar();

    expect(recuperacion.solicitar).toHaveBeenCalledWith('ana@ejemplo.com');
    expect(componente.enviado()).toBe(true);
  });
});
