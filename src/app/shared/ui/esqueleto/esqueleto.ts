import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

export type FormaEsqueleto = 'tabla' | 'lista' | 'campos' | 'bloque' | 'numero';

/**
 * Skeleton loader genérico (Reglas §12.2: "esperar información → skeleton"). Piezas grises
 * con un brillo, con la forma del contenido que va a llegar:
 * - `tabla`: encabezado + filas-tarjeta (listado de Pedidos).
 * - `lista`: filas separadas por línea con título, detalle y botón (Clientes, Equipo…).
 * - `campos`: etiquetas + campos de 46 px y el botón de guardar (formularios que cargan).
 * - `bloque`: un bloque del alto indicado (ticket, tarjetas sin forma fija).
 * - `numero`: la cifra de un contador; toma la letra de su contenedor (mide lo mismo).
 * `alto` es el alto de cada fila (o del bloque) para que mida como lo real.
 *
 * Llenar el espacio (dueño 2026-10-22): en `tabla` y `lista`, con `maximo` (lo que trae una
 * página real), el esqueleto ocupa el alto disponible de su contenedor con todas las filas que
 * quepan, sin pasar de `maximo`; si sobra espacio, agrega una fila más que el borde del
 * contenedor corta, para que el gris llegue hasta abajo como una lista real que sigue (dueño
 * 2026-10-22). Esa fila mide justo lo que sobra (no su alto completo): así el esqueleto nunca
 * pasa del alto disponible ni crea un scroll momentáneo en la página (dueño 2026-10-23). Si el contenedor no tiene un alto propio (p. ej. en teléfono, donde la sección
 * crece con su contenido), se queda con `filas` y sin fila cortada.
 */
@Component({
  selector: 'app-esqueleto',
  templateUrl: './esqueleto.html',
  styleUrl: './esqueleto.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.esk-host--llenar]': 'llena()' },
})
export class Esqueleto {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly forma = input<FormaEsqueleto>('lista');
  readonly filas = input(5);
  readonly alto = input(72);
  /** `tabla`/`lista`: cuántas filas trae como mucho una página real (activa el llenado). */
  readonly maximo = input<number | null>(null);
  /** Texto para lectores de pantalla. */
  readonly texto = input('Cargando...');
  /** `campos`: una línea de ayuda bajo cada campo (como las reales). */
  readonly ayuda = input(false);
  /** `campos`: una línea de nota al final (p. ej. "Último cambio: …"). */
  readonly nota = input(false);
  /**
   * `campos`: el botón de guardar en gris. Se quita cuando los botones reales siguen a la vista
   * mientras carga (si no, saldría dos veces).
   */
  readonly accion = input(true);

  /** Filas completas que caben en el alto disponible (null = aún sin medir o sin llenado). */
  private readonly caben = signal<number | null>(null);
  /** Espacio bajo la última fila completa (px): la fila cortada mide eso. 0 = no hay. */
  private readonly sobra = signal(0);

  readonly llena = computed(
    () => this.maximo() !== null && (this.forma() === 'tabla' || this.forma() === 'lista'),
  );

  readonly indices = computed(() => {
    const maximo = this.maximo() ?? this.filas();
    const medidas = this.llena() && this.caben() !== null;
    const n = medidas ? this.caben()! + (this.sobra() > 0 ? 1 : 0) : this.filas();
    return Array.from({ length: Math.max(1, Math.min(n, maximo)) }, (_, i) => i);
  });

  /** Alto de la fila `i`: la cortada (la que sigue a las que caben completas) mide lo que sobra. */
  altoDe(i: number): number {
    const caben = this.caben();
    return this.llena() && caben !== null && i === caben && this.sobra() > 0
      ? this.sobra()
      : this.alto();
  }

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!this.llena() || typeof ResizeObserver === 'undefined') {
        return;
      }
      const observador = new ResizeObserver(() => this.medir());
      observador.observe(this.host);
      destroyRef.onDestroy(() => observador.disconnect());
      this.medir();
    });
  }

  /**
   * Cuántas filas caben en el alto del componente. El componente crece con su contenedor (si
   * este tiene alto propio) y nunca menos que su contenido: así, sin alto propio, la cuenta da
   * las mismas filas que ya hay y no cambia.
   */
  private medir(): void {
    const caja = this.host.querySelector<HTMLElement>('.esk');
    if (!caja) {
      return;
    }
    const alto = this.host.clientHeight;
    const separacion = parseFloat(getComputedStyle(caja).rowGap) || 0;
    const cabecera = this.host.querySelector<HTMLElement>('.esk__cabecera');
    const disponible = alto - (cabecera ? cabecera.offsetHeight + separacion : 0);
    const paso = this.alto() + separacion;
    const n = Math.max(1, Math.floor((disponible + separacion) / paso));
    // Lo que queda bajo la última fila completa, descontando la separación que va antes de la fila
    // cortada. Sin alto propio el componente mide lo mismo que su contenido y aquí da 0: no se
    // agrega fila (si no, crecería sin fin).
    const restante = disponible - n * paso;
    if (n !== this.caben()) {
      this.caben.set(n);
    }
    this.sobra.set(restante > 1 ? Math.floor(restante) : 0);
  }
}
