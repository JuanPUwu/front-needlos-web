import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RecuperacionContrasenaService } from '../../services/recuperacion-contrasena.service';
import { RestablecerContrasena } from './restablecer-contrasena';

describe('RestablecerContrasena', () => {
  let recuperacion: { restablecer: ReturnType<typeof vi.fn> };
  let location: { replaceState: ReturnType<typeof vi.fn> };

  function crear(fragmento: string | null): RestablecerContrasena {
    recuperacion = { restablecer: vi.fn(() => of(undefined)) };
    location = { replaceState: vi.fn() };
    TestBed.configureTestingModule({
      imports: [RestablecerContrasena],
      providers: [
        provideRouter([]),
        { provide: RecuperacionContrasenaService, useValue: recuperacion },
        { provide: Location, useValue: location },
        { provide: ActivatedRoute, useValue: { snapshot: { fragment: fragmento } } },
      ],
    });
    return TestBed.createComponent(RestablecerContrasena).componentInstance;
  }

  function llenar(componente: RestablecerContrasena): void {
    componente.form.setValue({ contrasenaNueva: 'NuevaClave1!', confirmacion: 'NuevaClave1!' });
  }

  it('sin token en el enlace muestra el enlace como invalido', () => {
    const componente = crear(null);

    expect(componente.estado()).toBe('enlaceInvalido');
  });

  it('lee el token del fragmento y lo borra de la barra de direcciones', () => {
    const componente = crear('token=abc_123');
    llenar(componente);

    componente.enviar();

    expect(location.replaceState).toHaveBeenCalledWith('/restablecer-contrasena');
    expect(recuperacion.restablecer).toHaveBeenCalledWith('abc_123', 'NuevaClave1!');
    expect(componente.estado()).toBe('listo');
  });

  it('si el backend rechaza el enlace, pasa a enlace invalido', () => {
    const componente = crear('token=vencido');
    recuperacion.restablecer.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { status: 400, code: 'ENLACE_RECUPERACION_INVALIDO', detail: 'Vencido.' },
          }),
      ),
    );
    llenar(componente);

    componente.enviar();

    expect(componente.estado()).toBe('enlaceInvalido');
  });
});
