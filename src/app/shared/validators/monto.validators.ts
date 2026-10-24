import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Todos los montos de dinero son múltiplos de este valor (pesos colombianos). */
export const MULTIPLO_PESOS = 50;

/** Texto corto para la línea de la etiqueta. */
export const ERROR_MONTO = 'Múltiplo de $ 50, sin decimales';

/**
 * Monto en pesos colombianos (dueño 2026-10-23): entero, sin decimales ni separador de miles, y
 * múltiplo de 50, para no registrar valores que no existen en COP (p. ej. $1 o $25.000,50). Aplica
 * a todo lo que es dinero (precio base, precio unitario, descuento, abonos y gastos); las cantidades
 * de inventario sí admiten decimales. Vacío es válido: donde es obligatorio se suma `required`.
 * Misma regla en el backend: `@MontoCop`.
 */
export const montoCop: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const texto = String(control.value ?? '').trim();
  if (!texto) {
    return null;
  }
  return /^\d{1,10}$/.test(texto) && Number(texto) % MULTIPLO_PESOS === 0
    ? null
    : { montoCop: true };
};
