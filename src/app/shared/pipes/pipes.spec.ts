import { FechaHoraPipe } from './fecha-hora.pipe';
import { FechaPipe } from './fecha.pipe';
import { MonedaPipe } from './moneda.pipe';

describe('MonedaPipe', () => {
  const pipe = new MonedaPipe();

  it('formatea pesos sin decimales cuando no aportan', () => {
    expect(pipe.transform(25000)).toBe('$ 25.000');
  });

  it('muestra decimales cuando los hay', () => {
    expect(pipe.transform(25000.5)).toBe('$ 25.000,50');
  });

  it('devuelve vacío para null', () => {
    expect(pipe.transform(null)).toBe('');
  });
});

describe('FechaPipe', () => {
  const pipe = new FechaPipe();

  it('reordena yyyy-MM-dd a dd/MM/yyyy sin correr el día', () => {
    expect(pipe.transform('2026-10-01')).toBe('01/10/2026');
  });

  it('devuelve vacío si no hay fecha', () => {
    expect(pipe.transform(null)).toBe('');
  });
});

describe('FechaHoraPipe', () => {
  const pipe = new FechaHoraPipe();

  it('convierte el instante UTC a la hora de Colombia', () => {
    expect(pipe.transform('2026-10-20T02:30:00Z')).toBe('19/10/2026 21:30');
  });

  it('con "hora" muestra solo la hora', () => {
    expect(pipe.transform('2026-10-20T02:30:00Z', 'hora')).toBe('21:30');
  });
});
