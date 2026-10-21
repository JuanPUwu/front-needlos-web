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
import { MonedaPipe } from '../../pipes/moneda.pipe';

/** Una línea del gráfico: su nombre (leyenda), su color (token CSS) y un valor por punto. */
export interface SerieGrafico {
  nombre: string;
  color: string;
  valores: number[];
  /** Total que se muestra en la leyenda ("Ventas $ 1.850.000"); opcional. */
  total?: number;
}

/** Un punto del eje X: la etiqueta corta (eje) y la larga (cuadro al pasar el dedo o el mouse). */
export interface EtiquetaGrafico {
  corta: string;
  larga: string;
}

export type FormatoGrafico = 'moneda' | 'numero';

/** Margen de arriba y de abajo del área (el mismo; abajo caben las fechas). */
const MARGEN_VERTICAL = 24;
/** Ancho aproximado de un carácter de las etiquetas del eje (11 px, cifras tabulares). */
const ANCHO_LETRA = 6.5;
/** Espacio mínimo entre dos etiquetas del eje X. */
const SEPARACION_X = 10;
const MONEDA = new MonedaPipe();
const NUMERO = new Intl.NumberFormat('es-CO');

/**
 * Gráfico de líneas propio (SVG, sin librerías) para los informes (dueño 2026-10-20): ejes con
 * valores redondos, leyenda, y al pasar el mouse o tocar un punto, una guía vertical con los
 * valores de ese punto. Se adapta al tamaño de su contenedor. Para lectores de pantalla lleva una
 * tabla oculta con los mismos datos.
 */
@Component({
  selector: 'app-grafico-lineas',
  templateUrl: './grafico-lineas.html',
  styleUrl: './grafico-lineas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficoLineas {
  readonly etiquetas = input.required<EtiquetaGrafico[]>();
  readonly series = input.required<SerieGrafico[]>();
  readonly formato = input<FormatoGrafico>('numero');
  /** Descripción para lectores de pantalla ("Ventas e ingresos por día"). */
  readonly descripcion = input.required<string>();
  /** Mientras carga: solo la cuadrícula, en gris. */
  readonly cargando = input(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly ancho = signal(0);
  readonly alto = signal(0);
  /** Punto señalado (mouse o dedo). */
  readonly activo = signal<number | null>(null);

  /** Ancho de la etiqueta más larga del eje X. */
  private readonly anchoEtiqueta = computed(
    () => Math.max(0, ...this.etiquetas().map((e) => e.corta.length)) * ANCHO_LETRA,
  );

  /** Máximo "redondo" del eje Y y sus cuatro marcas. */
  readonly ejeY = computed(() => {
    const max = Math.max(0, ...this.series().flatMap((s) => s.valores));
    const tope = redondo(max);
    const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => tope * f);
    return { tope, marcas };
  });

  /**
   * Área de las líneas, simétrica (dueño 2026-10-20): el mismo margen a izquierda y derecha (media
   * etiqueta, para que la primera y la última fecha quepan centradas en su punto) y el mismo arriba
   * y abajo. Los valores del eje Y van dentro, sobre cada línea de la cuadrícula.
   */
  readonly area = computed(() => {
    const lado = Math.max(8, this.anchoEtiqueta() / 2);
    const w = Math.max(0, this.ancho() - 2 * lado);
    const h = Math.max(0, this.alto() - 2 * MARGEN_VERTICAL);
    return { x0: lado, y0: MARGEN_VERTICAL, w, h };
  });

  /** X de cada punto. */
  readonly xs = computed(() => {
    const { x0, w } = this.area();
    const n = this.etiquetas().length;
    return this.etiquetas().map((_, i) => (n <= 1 ? x0 + w / 2 : x0 + (w * i) / (n - 1)));
  });

  y(valor: number): number {
    const { y0, h } = this.area();
    const tope = this.ejeY().tope || 1;
    return y0 + h - (h * valor) / tope;
  }

  /** Trazo de cada serie. */
  readonly trazos = computed(() => {
    const xs = this.xs();
    return this.series().map((s) => ({
      ...s,
      d: s.valores
        .map((v, i) => `${i === 0 ? 'M' : 'L'}${xs[i].toFixed(1)},${this.y(v).toFixed(1)}`)
        .join(' '),
    }));
  });

  /**
   * Fechas del eje X a intervalos iguales y sin encimarse (dueño 2026-10-20), todas centradas en
   * su punto. El paso es el más corto que no las encima y se cuenta hacia atrás desde la última
   * fecha: la última siempre se ve y todos los intervalos miden lo mismo (la primera fecha solo
   * aparece si cae en el paso).
   */
  readonly marcasX = computed(() => {
    const xs = this.xs();
    const etiquetas = this.etiquetas();
    const n = xs.length;
    if (n === 0) {
      return [];
    }
    const entrePuntos = n > 1 ? this.area().w / (n - 1) : 0;
    const paso =
      n > 1 ? Math.max(1, Math.ceil((this.anchoEtiqueta() + SEPARACION_X) / entrePuntos)) : 1;
    const indices: number[] = [];
    for (let i = n - 1; i >= 0; i -= paso) {
      indices.unshift(i);
    }
    return indices.map((i) => ({ texto: etiquetas[i].corta, x: xs[i], i }));
  });

  /** Cuadro del punto señalado: a la derecha del punto, o a la izquierda si no cabe. */
  readonly cuadro = computed(() => {
    const i = this.activo();
    if (i === null || this.cargando()) {
      return null;
    }
    const x = this.xs()[i];
    return {
      x,
      izquierda: x > this.ancho() / 2,
      titulo: this.etiquetas()[i]?.larga ?? '',
      filas: this.series().map((s) => ({
        nombre: s.nombre,
        color: s.color,
        valor: this.formatear(s.valores[i] ?? 0),
        y: this.y(s.valores[i] ?? 0),
      })),
    };
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const medir = () => {
        const caja = this.host.getBoundingClientRect();
        this.ancho.set(caja.width);
        this.alto.set(caja.height);
      };
      medir();
      const observador = new ResizeObserver(medir);
      observador.observe(this.host);
      destroyRef.onDestroy(() => observador.disconnect());
    });
  }

  formatear(valor: number): string {
    return this.formato() === 'moneda' ? MONEDA.transform(valor) : NUMERO.format(valor);
  }

  /** Cifra corta para el eje Y ("$ 1,2 M", "$ 350 mil", "12"). */
  formatoEje(valor: number): string {
    if (this.formato() === 'numero') {
      return NUMERO.format(valor);
    }
    if (valor >= 1_000_000) {
      return `$ ${NUMERO.format(Math.round(valor / 100_000) / 10)} M`;
    }
    if (valor >= 1_000) {
      return `$ ${NUMERO.format(Math.round(valor / 1_000))} mil`;
    }
    return `$ ${NUMERO.format(valor)}`;
  }

  /** El punto más cercano al mouse o al dedo. */
  senalar(evento: PointerEvent): void {
    const svg = evento.currentTarget as SVGElement;
    const x = evento.clientX - svg.getBoundingClientRect().left;
    const xs = this.xs();
    let cercano = 0;
    xs.forEach((px, i) => {
      if (Math.abs(px - x) < Math.abs(xs[cercano] - x)) {
        cercano = i;
      }
    });
    this.activo.set(xs.length ? cercano : null);
  }

  soltar(): void {
    this.activo.set(null);
  }
}

/** Tope "redondo" del eje: 1, 2, 2.5 o 5 por potencia de 10 (al menos 1). */
function redondo(max: number): number {
  if (max <= 0) {
    return 1;
  }
  const potencia = 10 ** Math.floor(Math.log10(max));
  const paso = [1, 2, 2.5, 5, 10].find((p) => p * potencia >= max) ?? 10;
  return paso * potencia;
}
