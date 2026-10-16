/** Pesos sin separador de miles (25000), con 1 o 2 decimales opcionales (25000,50). */
export const PATRON_MONTO = /^\d{1,10}([.,]\d{1,2})?$/;

/** "25000,5" → 25000.5; vacío o inválido → null. */
export function aNumero(texto: string | null | undefined): number | null {
  const limpio = (texto ?? '').trim();
  if (!limpio || !PATRON_MONTO.test(limpio)) {
    return null;
  }
  return Number(limpio.replace(',', '.'));
}

/** Número a texto editable sin separador de miles (25000.5 → "25000,5"). */
export function aTexto(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '' : String(valor).replace('.', ',');
}
