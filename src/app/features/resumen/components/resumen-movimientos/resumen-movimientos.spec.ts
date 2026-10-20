import { TestBed } from '@angular/core/testing';
import { FILTROS_MOVIMIENTOS_INICIALES, Movimiento } from '../../models/resumen.model';
import { ResumenMovimientos } from './resumen-movimientos';

function movimiento(parcial: Partial<Movimiento> = {}): Movimiento {
  return {
    tipo: 'ABONO',
    id: 'a1',
    fecha: '2026-10-20',
    momento: '2026-10-20T15:30:00Z',
    metodo: 'EFECTIVO',
    monto: 20000,
    razon: null,
    pedidoId: 'p1',
    pedidoNumero: '#12-3',
    cliente: 'Ana Ruiz',
    ...parcial,
  };
}

describe('ResumenMovimientos', () => {
  function crear(movimientos: Movimiento[], varios = false) {
    const fixture = TestBed.createComponent(ResumenMovimientos);
    fixture.componentRef.setInput('movimientos', movimientos);
    fixture.componentRef.setInput('filtros', FILTROS_MOVIMIENTOS_INICIALES);
    fixture.componentRef.setInput('varios', varios);
    fixture.detectChanges();
    return fixture;
  }

  it('cada fila tiene un botón para abrirla con el teclado', () => {
    const fixture = crear([movimiento()]);
    const abiertos: Movimiento[] = [];
    fixture.componentInstance.abrir.subscribe((m) => abiertos.push(m));
    const boton = fixture.nativeElement.querySelector('.rm__abrir') as HTMLButtonElement;
    expect(boton.getAttribute('aria-label')).toBe('Abrir pedido #12-3');
    boton.click();
    expect(abiertos).toHaveLength(1);
  });

  it('en un solo día muestra la hora de Colombia; un gasto, sin hora', () => {
    const fixture = crear([
      movimiento(),
      movimiento({ tipo: 'GASTO', id: 'g1', razon: 'Hilos', pedidoNumero: null, cliente: null }),
    ]);
    const celdas = fixture.nativeElement.querySelectorAll('.rm__celda--cuando');
    expect(celdas[0].textContent.trim()).toBe('10:30');
    expect(celdas[1].textContent.trim()).toBe('—');
  });

  it('emite los filtros elegidos y solo ofrece limpiar cuando hay alguno', () => {
    const fixture = crear([]);
    const c = fixture.componentInstance;
    const cambios: unknown[] = [];
    c.filtrar.subscribe((f) => cambios.push(f));
    c.elegirTipo('GASTO');
    c.elegirMetodo('NEQUI');
    c.elegirOrden('momento,asc');
    expect(cambios).toEqual([{ tipo: 'GASTO' }, { metodo: 'NEQUI' }, { orden: 'momento,asc' }]);
    expect(fixture.nativeElement.querySelector('.rm-limpiar')).toBeNull();
    fixture.componentRef.setInput('filtros', { ...FILTROS_MOVIMIENTOS_INICIALES, tipo: 'GASTO' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.rm-limpiar')).not.toBeNull();
  });
});
