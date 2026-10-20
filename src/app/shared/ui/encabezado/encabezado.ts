import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Bandeja } from '../../../core/notificaciones/bandeja';
import { Campana } from '../campana/campana';
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
  imports: [RouterLink, Icono, Campana],
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
  /** Muestra el botón de recargar (las secciones con datos del servidor). */
  readonly recargable = input(false);
  /** Mientras recarga: el ícono gira y el botón no se puede volver a tocar. */
  readonly recargando = input(false);
  readonly recargar = output<void>();

  /**
   * La campana de notificaciones es la última acción del encabezado de una sección (Manual
   * §19.1). En un popup no va. Mientras no se sabe dónde está (primer render), no se muestra.
   */
  private readonly enDialogo = signal<boolean | null>(null);
  private readonly bandeja = inject(Bandeja);
  readonly conCampana = computed(() => this.enDialogo() === false && this.bandeja.activa());

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => this.enDialogo.set(!!host.closest('[role="dialog"]')));
  }
}
