import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icono, NombreIcono } from '../icono/icono';

/**
 * Encabezado de sección (Reglas §12.2): tarjeta con el ícono de la sección, título,
 * subtítulo y, a la derecha, las acciones principales (lo que se proyecte dentro). En las
 * sub-pantallas muestra la ruta de regreso ("Ajustes ›"). Igual en todas las secciones.
 * `error`: mensaje de la sección o del popup (p. ej. no se pudo cargar el listado) en una
 * cápsula roja en la misma línea del título, para no agregar filas que agranden el contenido.
 */
@Component({
  selector: 'app-encabezado',
  imports: [RouterLink, Icono],
  templateUrl: './encabezado.html',
  styleUrl: './encabezado.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Encabezado {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string | null>(null);
  readonly icono = input<NombreIcono | null>(null);
  /** Sub-pantallas: a dónde vuelve y cómo se llama (p. ej. '/ajustes', 'Ajustes'). */
  readonly volverRuta = input<string | null>(null);
  readonly volverEtiqueta = input<string | null>(null);
  /** id del título (un popup lo usa en aria-labelledby). */
  readonly idTitulo = input<string | null>(null);
  readonly error = input<string | null>(null);
}
