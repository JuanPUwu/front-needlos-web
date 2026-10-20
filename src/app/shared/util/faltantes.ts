import { FormGroup } from '@angular/forms';
import { OpcionesAviso } from '../../core/ui/confirmacion';

/** "a", "b" y "c" → "a, b y c". */
export function unirLista(partes: string[]): string {
  return partes.length <= 1
    ? (partes[0] ?? '')
    : `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`;
}

/**
 * Aviso de qué falta o qué está mal en un formulario (Reglas §12.3, dueño 2026-10-20): se
 * muestra con `Confirmacion.avisar()` en el centro de la pantalla. `etiquetas` dice cómo se
 * nombra cada campo ("el nombre"); un campo obligatorio vacío "falta", uno mal escrito se
 * "revisa". `revisar` agrega problemas que no son de un solo campo (p. ej. "que las
 * contraseñas coincidan"). Devuelve null si no hay nada que avisar.
 */
export function avisoFaltantes(
  form: FormGroup,
  accion: string,
  etiquetas: Record<string, string>,
  revisar: string[] = [],
): OpcionesAviso | null {
  const faltan: string[] = [];
  const malos = [...revisar];
  for (const [nombre, etiqueta] of Object.entries(etiquetas)) {
    const control = form.get(nombre);
    if (!control || control.disabled || control.valid) {
      continue;
    }
    (control.hasError('required') ? faltan : malos).push(etiqueta);
  }
  if (faltan.length === 0 && malos.length === 0) {
    return null;
  }
  const frases: string[] = [];
  if (faltan.length > 0) {
    frases.push(`Para ${accion} falta ${unirLista(faltan)}.`);
  }
  if (malos.length > 0) {
    frases.push(
      faltan.length > 0
        ? `Revisa también ${unirLista(malos)}.`
        : `Para ${accion} revisa ${unirLista(malos)}.`,
    );
  }
  return {
    titulo: faltan.length > 0 ? 'Falta información' : 'Revisa la información',
    mensaje: frases.join(' '),
  };
}
