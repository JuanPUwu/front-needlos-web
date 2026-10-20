import { DestroyRef, EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AUSENCIA_MINIMA_MS, recargaAutomatica } from './recarga-automatica';

describe('recargaAutomatica', () => {
  let visible: DocumentVisibilityState;
  let injector: EnvironmentInjector;

  function cambiarVisibilidad(estado: DocumentVisibilityState): void {
    visible = estado;
    document.dispatchEvent(new Event('visibilitychange'));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    visible = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible);
    injector = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
  });

  afterEach(() => {
    injector.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function iniciar(recargar: () => void, opciones = {}): void {
    injector.runInContext(() => recargaAutomatica(recargar, opciones));
  }

  it('recarga al volver a la pestaña solo si estuvo fuera un rato', () => {
    const recargar = vi.fn();
    iniciar(recargar);

    cambiarVisibilidad('hidden');
    vi.advanceTimersByTime(5_000);
    cambiarVisibilidad('visible');
    expect(recargar).not.toHaveBeenCalled();

    cambiarVisibilidad('hidden');
    vi.advanceTimersByTime(AUSENCIA_MINIMA_MS);
    cambiarVisibilidad('visible');
    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it('la recarga periódica no corre con la pestaña oculta ni cuando no se puede', () => {
    const recargar = vi.fn();
    let puede = true;
    iniciar(recargar, { cadaMs: 1_000, puede: () => puede });

    vi.advanceTimersByTime(1_000);
    expect(recargar).toHaveBeenCalledTimes(1);

    puede = false; // p. ej. un popup abierto
    vi.advanceTimersByTime(1_000);
    expect(recargar).toHaveBeenCalledTimes(1);

    puede = true;
    visible = 'hidden';
    vi.advanceTimersByTime(1_000);
    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it('se detiene al salir de la sección', () => {
    const recargar = vi.fn();
    iniciar(recargar, { cadaMs: 1_000 });
    injector.get(DestroyRef);
    injector.destroy();
    vi.advanceTimersByTime(5_000);
    cambiarVisibilidad('hidden');
    vi.advanceTimersByTime(AUSENCIA_MINIMA_MS);
    cambiarVisibilidad('visible');
    expect(recargar).not.toHaveBeenCalled();
    injector = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
  });
});
