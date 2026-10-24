import { TestBed } from '@angular/core/testing';
import { EstadoBarra } from './estado-barra';

describe('EstadoBarra', () => {
  it('muestra la cantidad de cada estado y del total, y avisa la pestaña elegida', () => {
    const fixture = TestBed.createComponent(EstadoBarra);
    fixture.componentRef.setInput('estado', 'EN_PROCESO');
    const barra = fixture.componentInstance;
    expect(barra.cantidadDe('EN_PROCESO')).toBeNull();
    fixture.componentRef.setInput('conteos', {
      enProceso: 4,
      listosParaEntregar: 2,
      entregados: 7,
      anulados: 1,
      total: 14,
      vencidos: 0,
      paraEntregarHoy: 0,
    });
    expect(barra.cantidadDe('EN_PROCESO')).toBe(4);
    expect(barra.cantidadDe('FINALIZADO')).toBe(2);
    expect(barra.cantidadDe('ENTREGADO')).toBe(7);
    expect(barra.cantidadDe('ANULADO')).toBe(1);
    expect(barra.cantidadDe('')).toBe(14);

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
