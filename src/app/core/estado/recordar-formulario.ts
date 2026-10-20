import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { Memoria } from './memoria';

/** Borrador guardado: los valores del formulario más el estado extra que se pidió. */
export type Borrador<X extends object = object> = X & { valores: Record<string, unknown> };

export interface FormularioRecordado<X extends object> {
  /** Lo guardado; quien lo usa decide cómo restaurarlo (patchValue, filas de un FormArray…). */
  leer(): Borrador<X> | null;
  /** Olvida el borrador (al guardar con éxito o al cancelar). */
  olvidar(): void;
}

/**
 * Guarda el borrador de un formulario mientras se escribe (a los 400 ms de la última tecla)
 * para no perderlo al recargar. `extra()` añade estado que no vive en el formulario (p. ej.
 * qué registro se está editando). Los campos de `omitir` (contraseñas) nunca se guardan.
 * Solo guarda si el usuario tocó el formulario.
 */
export function recordarFormulario<X extends object = object>(
  form: AbstractControl,
  memoria: Memoria,
  clave: string,
  destroyRef: DestroyRef,
  opciones: { omitir?: string[]; extra?: () => X } = {},
): FormularioRecordado<X> {
  form.valueChanges.pipe(debounceTime(400), takeUntilDestroyed(destroyRef)).subscribe(() => {
    if (!form.dirty) {
      return;
    }
    const valores = { ...(form.getRawValue() as Record<string, unknown>) };
    for (const campo of opciones.omitir ?? []) {
      delete valores[campo];
    }
    memoria.guardar(clave, { ...(opciones.extra?.() ?? {}), valores });
  });
  return {
    leer: () => memoria.leer<Borrador<X>>(clave),
    olvidar: () => memoria.olvidar(clave),
  };
}
