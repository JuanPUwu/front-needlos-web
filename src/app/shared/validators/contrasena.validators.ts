import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Misma politica que el backend (@ContrasenaSegura): 8 a 72, mayuscula, minuscula, numero y especial. */
export const POLITICA_CONTRASENA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/;

/** Validador de grupo: marca `noCoinciden` si los dos campos tienen valores distintos. */
export function camposIguales(campo: string, confirmacion: string): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const valor = grupo.get(campo)?.value;
    const repetido = grupo.get(confirmacion)?.value;
    return valor && repetido && valor !== repetido ? { noCoinciden: true } : null;
  };
}
