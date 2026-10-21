import { etiquetaPunto, recortarHoras } from './serie-grafico';

describe('serie del gráfico de informes', () => {
  it('etiqueta las horas y los días', () => {
    expect(etiquetaPunto('08', 'HORA')).toEqual({ corta: '8 h', larga: '8:00 a 8:59' });
    expect(etiquetaPunto('2026-10-20', 'DIA')).toEqual({ corta: '20/10', larga: 'mar 20/10/2026' });
  });

  it('por horas quita los extremos vacíos pero deja la jornada de 8 a 18', () => {
    const horas = Array.from({ length: 24 }, (_, h) => ({
      clave: String(h).padStart(2, '0'),
      v: h === 6 || h === 20 ? 5 : 0,
    }));
    const vistas = recortarHoras(horas, 'HORA', (p) => p.v > 0).map((p) => p.clave);
    expect(vistas[0]).toBe('06');
    expect(vistas.at(-1)).toBe('20');

    const vacio = recortarHoras(
      horas.map((p) => ({ ...p, v: 0 })),
      'HORA',
      (p) => p.v > 0,
    );
    expect(vacio.map((p) => p.clave)).toEqual([
      '08',
      '09',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
    ]);
  });

  it('por días no recorta nada', () => {
    const dias = [{ clave: '2026-10-19' }, { clave: '2026-10-20' }];
    expect(recortarHoras(dias, 'DIA', () => false)).toEqual(dias);
  });
});
