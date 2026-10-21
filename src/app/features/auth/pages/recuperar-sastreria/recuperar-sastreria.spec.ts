import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { RecuperacionPendiente } from '../../../../core/auth/auth.model';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { RecuperarSastreria } from './recuperar-sastreria';

describe('RecuperarSastreria', () => {
  const pendiente = signal<RecuperacionPendiente | null>(null);
  let recuperarSastreria: ReturnType<typeof vi.fn>;
  let cancelarRecuperacion: ReturnType<typeof vi.fn>;

  function crear(): RecuperarSastreria {
    recuperarSastreria = vi.fn(() => of(undefined));
    cancelarRecuperacion = vi.fn();
    TestBed.configureTestingModule({
      imports: [RecuperarSastreria],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            recuperacionPendiente: pendiente,
            recuperarSastreria,
            cancelarRecuperacion,
            autenticado: () => false,
          },
        },
        { provide: Notificaciones, useValue: { exito: vi.fn(), error: vi.fn(), info: vi.fn() } },
      ],
    });
    return TestBed.createComponent(RecuperarSastreria).componentInstance;
  }

  it('sin una recuperación pendiente vuelve al login', () => {
    pendiente.set(null);
    const navegar = vi.spyOn(Router.prototype, 'navigate').mockResolvedValue(true);
    crear();
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });

  it('recupera la sastrería elegida y no repite mientras recupera', () => {
    pendiente.set({
      preauthToken: 'pre',
      sastrerias: [
        { tenantId: 't1', nombre: 'Sastrería Prueba', seBorraEl: '2027-01-18T00:00:00Z' },
      ],
    });
    const pagina = crear();
    pagina.recuperar('t1', 'Sastrería Prueba');
    expect(recuperarSastreria).toHaveBeenCalledWith('t1');

    pagina.cancelar();
    expect(cancelarRecuperacion).toHaveBeenCalled();
  });
});
