/**
 * Texto comparable para filtros en el navegador: minúsculas, sin tildes y sin espacios
 * sobrantes ("Pantalón" y "pantalon" coinciden).
 */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** true si alguno de los campos contiene el texto buscado (vacío = todo coincide). */
export function coincide(buscado: string, ...campos: (string | null | undefined)[]): boolean {
  const aguja = normalizar(buscado);
  return aguja === '' || campos.some((c) => c != null && normalizar(c).includes(aguja));
}
