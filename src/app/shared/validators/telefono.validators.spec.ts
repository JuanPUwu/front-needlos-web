import { FormControl } from '@angular/forms';
import { telefonoColombia } from './telefono.validators';

describe('telefonoColombia', () => {
  const valida = (valor: string) => telefonoColombia(new FormControl(valor)) === null;

  it('acepta celulares (3XX) y fijos (60X) de 10 dígitos', () => {
    expect(valida('3001234567')).toBe(true);
    expect(valida('6015551234')).toBe(true);
    expect(valida(' 3001234567 ')).toBe(true);
  });

  it('vacío o solo espacios es válido (lo obligatorio lo decide required)', () => {
    expect(valida('')).toBe(true);
    expect(valida('   ')).toBe(true);
  });

  it('rechaza otros largos, prefijos y caracteres', () => {
    for (const malo of ['3001234', '30012345678', '2001234567', '6091234567', '300-123-4567']) {
      expect(valida(malo)).toBe(false);
    }
  });
});
