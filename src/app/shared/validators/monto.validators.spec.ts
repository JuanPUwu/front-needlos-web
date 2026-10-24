import { FormControl } from '@angular/forms';
import { montoCop } from './monto.validators';

describe('montoCop', () => {
  const valida = (valor: string) => montoCop(new FormControl(valor)) === null;

  it('acepta pesos enteros múltiplos de 50 y vacío', () => {
    expect(valida('')).toBe(true);
    expect(valida('0')).toBe(true);
    expect(valida('50')).toBe(true);
    expect(valida('25000')).toBe(true);
    expect(valida('25050')).toBe(true);
  });

  it('rechaza decimales, valores que no existen en COP y separadores', () => {
    expect(valida('1')).toBe(false);
    expect(valida('25020')).toBe(false);
    expect(valida('25000,50')).toBe(false);
    expect(valida('25000.5')).toBe(false);
    expect(valida('25.000')).toBe(false);
    expect(valida('-50')).toBe(false);
  });
});
