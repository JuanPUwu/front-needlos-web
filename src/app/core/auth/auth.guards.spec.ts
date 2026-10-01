import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Rol } from './auth.model';
import { AuthService } from './auth.service';
import { autenticadoGuard, invitadoGuard, rolGuard } from './auth.guards';

describe('guards de autenticacion', () => {
  const autenticado = signal(false);
  const roles = signal<Rol[]>([]);
  const auth = { autenticado, roles, rutaInicial: () => '/inicio' };

  beforeEach(() => {
    autenticado.set(false);
    roles.set([]);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });

  const ejecutar = (guard: typeof autenticadoGuard) =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  const destino = (resultado: unknown) => TestBed.inject(Router).serializeUrl(resultado as UrlTree);

  it('autenticadoGuard envia al login sin sesion', () => {
    expect(destino(ejecutar(autenticadoGuard))).toBe('/login');
  });

  it('rolGuard deja pasar con un rol permitido', () => {
    autenticado.set(true);
    roles.set(['SASTRE']);

    expect(ejecutar(rolGuard('SASTRE', 'SASTRE_ADMIN'))).toBe(true);
  });

  it('rolGuard redirige a la ruta inicial si el rol no esta permitido', () => {
    autenticado.set(true);
    roles.set(['SASTRE']);

    expect(destino(ejecutar(rolGuard('SUPER_ADMIN')))).toBe('/inicio');
  });

  it('invitadoGuard saca del login a quien ya tiene sesion', () => {
    autenticado.set(true);

    expect(destino(ejecutar(invitadoGuard))).toBe('/inicio');
  });
});
