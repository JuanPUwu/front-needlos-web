import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { SelectorSastreria } from './selector-sastreria';

describe('SelectorSastreria', () => {
  let cambiarSastreria: ReturnType<typeof vi.fn>;
  let selector: SelectorSastreria;

  beforeEach(() => {
    cambiarSastreria = vi.fn(() => of(undefined));
    TestBed.configureTestingModule({
      imports: [SelectorSastreria],
      providers: [
        {
          provide: AuthService,
          useValue: {
            sesion: signal({ sastreria: { tenantId: 't1', nombre: 'Uno' } }),
            misSastrerias: () =>
              of([
                { tenantId: 't1', nombre: 'Uno', slug: 'uno', roles: ['SASTRE_ADMIN'] },
                { tenantId: 't2', nombre: 'Dos', slug: 'dos', roles: ['SASTRE'] },
              ]),
            cambiarSastreria,
          },
        },
      ],
    });
    selector = TestBed.createComponent(SelectorSastreria).componentInstance;
  });

  it('al abrir carga las sastrerías y marca la actual', () => {
    selector.alternar();
    expect(selector.sastrerias()?.length).toBe(2);
    expect(selector.actual()).toBe('t1');
    expect(selector.etiquetaRol(selector.sastrerias()![1])).toBe('Sastre');
  });

  it('cambia a otra, pero no a la actual', () => {
    selector.alternar();
    const [uno, dos] = selector.sastrerias()!;
    selector.cambiar(uno);
    expect(cambiarSastreria).not.toHaveBeenCalled();
    selector.cambiar(dos);
    expect(cambiarSastreria).toHaveBeenCalledWith('t2');
  });

  it('"Crear otra sastrería" cierra el menú y abre el popup', () => {
    selector.alternar();
    selector.abrirCrear();
    expect(selector.abierto()).toBe(false);
    expect(selector.crearAbierto()).toBe(true);
  });
});
