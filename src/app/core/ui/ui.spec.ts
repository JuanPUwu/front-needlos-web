import { TestBed } from '@angular/core/testing';
import { Actividad } from './actividad';
import { Confirmacion } from './confirmacion';
import { Notificaciones } from './notificaciones';

describe('capas globales de la interfaz', () => {
  it('las notificaciones se apilan y se van solas', () => {
    vi.useFakeTimers();
    const n = TestBed.inject(Notificaciones);
    n.exito('Invitación enviada.');
    n.error('No se pudo guardar.');
    expect(n.lista().map((x) => x.tipo)).toEqual(['exito', 'error']);
    vi.advanceTimersByTime(4100);
    expect(n.lista().map((x) => x.tipo)).toEqual(['error']);
    vi.advanceTimersByTime(2000);
    expect(n.lista()).toEqual([]);
    vi.useRealTimers();
  });

  it('con una campana a la vista salen de a una en la barra; sin ella, en la esquina', () => {
    vi.useFakeTimers();
    const n = TestBed.inject(Notificaciones);
    const quitar = n.registrarCampana();
    n.exito('Pedido #1-1 creado.');
    n.info('Cliente Ana creado.');
    expect(n.cinta()?.mensaje).toBe('Pedido #1-1 creado.');
    expect(n.lista()).toEqual([]);
    vi.advanceTimersByTime(4100);
    expect(n.cinta()).toBeNull(); // se recoge antes de mostrar la siguiente
    vi.advanceTimersByTime(300);
    expect(n.cinta()?.mensaje).toBe('Cliente Ana creado.');
    n.cerrarCinta();
    expect(n.cinta()).toBeNull();

    quitar();
    n.exito('Sin campana.');
    expect(n.cinta()).toBeNull();
    expect(n.lista().map((x) => x.mensaje)).toEqual(['Sin campana.']);
    vi.useRealTimers();
  });

  it('la confirmación responde lo que elige el usuario', async () => {
    const c = TestBed.inject(Confirmacion);
    const respuesta = c.pedir({ titulo: '¿Seguro?', mensaje: 'x', aceptar: 'Sí' });
    expect(c.actual()?.titulo).toBe('¿Seguro?');
    c.responder(true);
    expect(await respuesta).toBe(true);
    expect(c.actual()).toBeNull();
  });

  it('la actividad bloquea mientras haya acciones en curso', () => {
    const a = TestBed.inject(Actividad);
    a.empezar();
    a.empezar();
    a.terminar();
    expect(a.ocupado()).toBe(true);
    a.terminar();
    expect(a.ocupado()).toBe(false);
  });
});
