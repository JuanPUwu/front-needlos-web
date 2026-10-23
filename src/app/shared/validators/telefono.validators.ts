import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Teléfono de Colombia (dueño 2026-10-21): exactamente 10 dígitos, celular (3XX XXX XXXX) o fijo
 * (60X XXX XXXX). Aplica a TODOS los teléfonos (registro, clientes, pedidos, equipo y Mi
 * sastrería). Es la misma regla del backend (`@TelefonoColombia`): así no se hace una petición
 * que el servidor va a rechazar.
 */
export const TELEFONO_COLOMBIA = /^(3\d{9}|60[1-8]\d{7})$/;

/** Mensaje corto para la línea del título del campo. */
export const ERROR_TELEFONO = '10 dígitos (3XX o 60X)';

/**
 * Valida el teléfono sin espacios alrededor. Vacío (o solo espacios) es válido: donde es
 * obligatorio se suma `Validators.required`.
 */
export const telefonoColombia: ValidatorFn = (
  control: AbstractControl<string | null>,
): ValidationErrors | null => {
  const valor = (control.value ?? '').trim();
  return valor === '' || TELEFONO_COLOMBIA.test(valor) ? null : { telefono: true };
};
