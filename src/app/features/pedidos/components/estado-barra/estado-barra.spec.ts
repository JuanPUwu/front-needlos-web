import { TestBed } from '@angular/core/testing';
import { EstadoBarra } from './estado-barra';

describe('EstadoBarra', () => {
  it('muestra la cantidad solo en "En proceso" y "Finalizado" y avisa la pestaña elegida', () => {
    const fixture = TestBed.createComponent(EstadoBarra);
    fixture.componentRef.setInput('estado', 'EN_PROCESO');
    fixture.componentRef.setInput('enProceso', 4);
    fixture.componentRef.setInput('finalizados', 2);
    const barra = fixture.componentInstance;
    expect(barra.cantidadDe('EN_PROCESO')).toBe(4);
    expect(barra.cantidadDe('FINALIZADO')).toBe(2);
    expect(barra.cantidadDe('')).toBeNull();

    const elegidos: string[] = [];
    barra.elegir.subscribe((e) => elegidos.push(e));
    fixture.detectChanges();
    const pestanas = fixture.nativeElement.querySelectorAll('[role="tab"]');
    expect(pestanas.length).toBe(5);
    expect(pestanas[0].getAttribute('aria-selected')).toBe('true');
    pestanas[4].click();
    expect(elegidos).toEqual(['']);
  });
});
