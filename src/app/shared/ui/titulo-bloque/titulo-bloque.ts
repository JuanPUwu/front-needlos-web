import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Fila de título de una tarjeta (Reglas §12.2): el título a la izquierda y, en la MISMA línea, el
 * mensaje de error de la tarjeta (en rojo, recortado con "…"; el texto completo en `title`). Así
 * un error nunca agrega una fila ni cambia el alto de la tarjeta. Lo proyectado (p. ej. un
 * paginador o un botón) va al final de la fila.
 */
@Component({
  selector: 'app-titulo-bloque',
  templateUrl: './titulo-bloque.html',
  styleUrl: './titulo-bloque.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TituloBloque {
  readonly titulo = input.required<string>();
  /** id del título (para el aria-labelledby de la tarjeta). */
  readonly idTitulo = input<string | null>(null);
  readonly error = input<string | null>(null);
}
