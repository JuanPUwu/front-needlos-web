import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompletarGoogleModal } from './completar-google-modal';

describe('CompletarGoogleModal', () => {
  let registrar: ReturnType<typeof vi.fn>;
  let modal: CompletarGoogleModal;

  beforeEach(() => {
    registrar = vi.fn(() => of(undefined));
    TestBed.configureTestingModule({
      imports: [CompletarGoogleModal],
      providers: [
        {
          provide: AuthService,
          useValue: { registrarSastreriaGoogle: registrar, autenticado: signal(false) },
        },
      ],
    });
    const fixture = TestBed.createComponent(CompletarGoogleModal);
    fixture.componentRef.setInput('idToken', 'a.eyJlbWFpbCI6ImFuYUB4LmNvbSJ9.b');
    fixture.componentRef.setInput('nombreSastreria', 'El Buen Corte');
    modal = fixture.componentInstance;
  });

  it('muestra el correo de la cuenta de Google', () => {
    expect(modal.cuenta()?.email).toBe('ana@x.com');
  });

  it('sin documento no registra', () => {
    modal.crear();
    expect(registrar).not.toHaveBeenCalled();
  });

  it('envía documento y teléfono (vacío como null) con el token y el nombre', () => {
    modal.form.setValue({ numeroDocumento: ' 1012345678 ', telefono: '' });
    modal.crear();
    expect(registrar).toHaveBeenCalledWith({
      idToken: 'a.eyJlbWFpbCI6ImFuYUB4LmNvbSJ9.b',
      nombreSastreria: 'El Buen Corte',
      numeroDocumento: '1012345678',
      telefono: null,
    });
  });
});
