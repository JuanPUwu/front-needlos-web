import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SastreriaResumen } from '../../../../core/auth/auth.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { MisSastrerias } from './mis-sastrerias';

describe('MisSastrerias', () => {
  let cambiarSastreria: ReturnType<typeof vi.fn>;
  let lista: SastreriaResumen[];

  function crear(): MisSastrerias {
    TestBed.configureTestingModule({
      imports: [MisSastrerias],
      providers: [
        {
          provide: AuthService,
          useValue: {
            sesion: signal({ sastreria: { tenantId: 't1', nombre: 'Uno' } }),
            misSastrerias: () => of(lista),
            cambiarSastreria,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(MisSastrerias);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    cambiarSastreria = vi.fn(() => of(undefined));
    lista = [
      { tenantId: 't1', nombre: 'Uno', slug: 'uno', roles: ['SASTRE_ADMIN'] },
      { tenantId: 't2', nombre: 'Dos', slug: 'dos', roles: ['SASTRE'] },
    ];
  });

  it('carga las sastrerías al abrir Mi cuenta y marca la actual', () => {
    const ms = crear();
    expect(ms.sastrerias()?.length).toBe(2);
    expect(ms.actual()).toBe('t1');
    expect(ms.etiquetaRol(ms.sastrerias()![1])).toBe('Sastre');
  });

  it('entra a otra, pero no a la actual', () => {
    const ms = crear();
    const [uno, dos] = ms.sastrerias()!;
    ms.cambiar(uno);
    expect(cambiarSastreria).not.toHaveBeenCalled();
    ms.cambiar(dos);
    expect(cambiarSastreria).toHaveBeenCalledWith('t2');
  });

  it('con el máximo de sastrerías ya no deja crear otra', () => {
    expect(crear().alLimite()).toBe(false);
    TestBed.resetTestingModule();
    lista = Array.from({ length: 5 }, (_, i) => ({
      tenantId: `t${i + 1}`,
      nombre: `S${i + 1}`,
      slug: `s${i + 1}`,
      roles: ['SASTRE_ADMIN' as const],
    }));
    expect(crear().alLimite()).toBe(true);
  });
});
