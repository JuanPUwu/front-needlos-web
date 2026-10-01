import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { codigoDeError, mensajeDeError } from './api-error';

describe('mensajeDeError', () => {
  it('usa el detalle del ProblemDetail del backend', () => {
    const error = new HttpErrorResponse({
      status: 401,
      error: {
        status: 401,
        code: 'CREDENCIALES_INVALIDAS',
        detail: 'Correo o contrasena incorrectos.',
      },
    });

    expect(mensajeDeError(error, 'generico')).toBe('Correo o contrasena incorrectos.');
    expect(codigoDeError(error)).toBe('CREDENCIALES_INVALIDAS');
  });

  it('informa la falta de conexion', () => {
    expect(mensajeDeError(new HttpErrorResponse({ status: 0 }), 'generico')).toContain('conexion');
  });

  it('informa el tiempo de espera agotado', () => {
    expect(mensajeDeError(new TimeoutError(), 'generico')).toContain('tardo demasiado');
  });

  it('usa el mensaje por defecto si la respuesta no es un error estandar', () => {
    const error = new HttpErrorResponse({ status: 500, error: '<html>' });

    expect(mensajeDeError(error, 'generico')).toBe('generico');
    expect(codigoDeError(error)).toBeNull();
  });
});
