/** Fecha local de hoy en formato yyyy-MM-dd (la que usan los inputs date y el backend). */
export function hoyIso(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** UUID para la cabecera Idempotency-Key (una por operación, se reusa al reintentar). */
export function nuevaClave(): string {
  return crypto.randomUUID();
}
