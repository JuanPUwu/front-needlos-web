import { aNumero, aTexto } from './montos';

describe('montos', () => {
  it('convierte texto sin separador de miles a número', () => {
    expect(aNumero('25000')).toBe(25000);
    expect(aNumero('25000,5')).toBe(25000.5);
    expect(aNumero(' 25000.50 ')).toBe(25000.5);
    expect(aNumero('25.000')).toBeNull(); // ambiguo: no se acepta separador de miles
    expect(aNumero('')).toBeNull();
    expect(aNumero('abc')).toBeNull();
    expect(aNumero('-5')).toBeNull();
  });

  it('convierte número a texto editable con coma decimal', () => {
    expect(aTexto(25000.5)).toBe('25000,5');
    expect(aTexto(null)).toBe('');
  });
});
