import { fechasDePeriodo } from './resumen.service';

describe('fechasDePeriodo', () => {
  // Miércoles 21 de octubre de 2026.
  const miercoles = new Date(2026, 9, 21);

  it('Hoy es solo el día', () => {
    expect(fechasDePeriodo('hoy', miercoles)).toEqual({ desde: '2026-10-21', hasta: '2026-10-21' });
  });

  it('las semanas van de lunes a domingo', () => {
    expect(fechasDePeriodo('semana', miercoles)).toEqual({
      desde: '2026-10-19',
      hasta: '2026-10-25',
    });
    expect(fechasDePeriodo('semana-pasada', miercoles)).toEqual({
      desde: '2026-10-12',
      hasta: '2026-10-18',
    });
  });

  it('un domingo sigue siendo de la semana que empezó el lunes anterior', () => {
    const domingo = new Date(2026, 9, 25);
    expect(fechasDePeriodo('semana', domingo)).toEqual({
      desde: '2026-10-19',
      hasta: '2026-10-25',
    });
  });

  it('Este mes va del día 1 a hoy', () => {
    expect(fechasDePeriodo('mes', miercoles)).toEqual({ desde: '2026-10-01', hasta: '2026-10-21' });
  });
});
