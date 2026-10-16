import { coincide, normalizar } from './texto';

describe('texto', () => {
  it('normaliza tildes, mayúsculas y espacios', () => {
    expect(normalizar('  Pantalón ')).toBe('pantalon');
  });

  it('coincide si algún campo contiene el texto; vacío coincide siempre', () => {
    expect(coincide('PANTA', 'Pantalón')).toBe(true);
    expect(coincide('ana', null, 'Ana Pérez')).toBe(true);
    expect(coincide('saco', 'Camisa')).toBe(false);
    expect(coincide('', 'Camisa')).toBe(true);
  });
});
