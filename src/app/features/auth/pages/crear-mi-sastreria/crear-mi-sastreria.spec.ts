import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../../core/auth/auth.service';
import { CrearMiSastreria } from './crear-mi-sastreria';

describe('CrearMiSastreria', () => {
  let crearPrimeraSastreria: ReturnType<typeof vi.fn>;
  let pagina: CrearMiSastreria;

  beforeEach(() => {
    crearPrimeraSastreria = vi.fn(() => of(undefined));
    TestBed.configureTestingModule({
      imports: [CrearMiSastreria],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            sinSastreriaPendiente: signal('preauth'),
            crearPrimeraSastreria,
            cancelarSinSastreria: vi.fn(),
          },
        },
      ],
    });
    pagina = TestBed.createComponent(CrearMiSastreria).componentInstance;
  });

  it('sin nombre no crea nada', () => {
    pagina.crear();
    expect(crearPrimeraSastreria).not.toHaveBeenCalled();
  });

  it('crea la sastrería con el nombre limpio', () => {
    pagina.nombre.setValue('  Mi Taller ');
    pagina.crear();
    expect(crearPrimeraSastreria).toHaveBeenCalledWith('Mi Taller');
  });

  it('si el nombre ya existe, marca el campo', () => {
    crearPrimeraSastreria.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { code: 'NOMBRE_SASTRERIA_EN_USO', detail: 'Ya existe.' },
          }),
      ),
    );
    pagina.nombre.setValue('Mi Taller');
    pagina.crear();
    expect(pagina.nombreRechazado()).toBe('Mi Taller');
  });
});
