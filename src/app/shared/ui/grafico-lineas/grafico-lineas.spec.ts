import { TestBed } from '@angular/core/testing';
import { GraficoLineas } from './grafico-lineas';

describe('GraficoLineas', () => {
  function crear(dias: number, ancho: number) {
    const fixture = TestBed.createComponent(GraficoLineas);
    const etiquetas = Array.from({ length: dias }, (_, i) => {
      const d = String(i + 1).padStart(2, '0');
      return { corta: `${d}/10`, larga: `${d}/10/2026` };
    });
    fixture.componentRef.setInput('etiquetas', etiquetas);
    fixture.componentRef.setInput('series', [
      { nombre: 'Ventas', color: 'blue', valores: etiquetas.map((_, i) => i * 1000) },
    ]);
    fixture.componentRef.setInput('descripcion', 'Ventas por día');
    const grafico = fixture.componentInstance;
    grafico.ancho.set(ancho);
    grafico.alto.set(200);
    return grafico;
  }

  /** Extensión de cada etiqueta con el mismo anclaje que la plantilla. */
  function sinEncimarse(grafico: GraficoLineas, total: number): boolean {
    const marcas = grafico.marcasX();
    const caja = marcas.map((m) => [
      m.x - (m.texto.length * 6.5) / 2,
      m.x + (m.texto.length * 6.5) / 2,
    ]);
    const dentro = caja.every((c) => c[0] >= 0 && c[1] <= grafico.ancho());
    return dentro && caja.every((c, k) => k === 0 || c[0] >= caja[k - 1][1]) && total > 0;
  }

  it('las fechas del eje nunca se enciman y la última siempre se ve', () => {
    for (const [dias, ancho] of [
      [2, 120],
      [7, 160],
      [7, 600],
      [31, 300],
      [31, 900],
    ]) {
      const grafico = crear(dias, ancho);
      const marcas = grafico.marcasX();
      expect(marcas.at(-1)?.i).toBe(dias - 1);
      expect(sinEncimarse(grafico, dias)).toBe(true);
    }
  });

  it('las fechas quedan siempre a intervalos iguales', () => {
    // 20 días (19 tramos, número primo) y 31 días: todos los intervalos miden lo mismo.
    for (const [dias, ancho] of [
      [20, 500],
      [31, 600],
      [31, 300],
    ]) {
      const marcas = crear(dias, ancho).marcasX();
      const pasos = marcas.slice(1).map((m, k) => m.i - marcas[k].i);
      expect(new Set(pasos).size).toBeLessThanOrEqual(1);
    }
  });

  it('el margen de la izquierda es igual al de la derecha, y el de arriba al de abajo', () => {
    const g = crear(7, 500);
    const a = g.area();
    expect(a.x0).toBeCloseTo(500 - (a.x0 + a.w));
    expect(a.y0).toBeCloseTo(200 - (a.y0 + a.h));
  });

  it('con espacio de sobra muestra todos los días', () => {
    expect(crear(7, 900).marcasX()).toHaveLength(7);
  });
});
