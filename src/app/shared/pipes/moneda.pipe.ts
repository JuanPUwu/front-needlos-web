import { Pipe, PipeTransform } from '@angular/core';

const ENTERO = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const CON_DECIMALES = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Pesos colombianos (Reglas §12.2): decimales solo cuando aportan.
 * 25000 -> "$ 25.000" · 25000.5 -> "$ 25.000,50" · null -> "".
 */
@Pipe({ name: 'moneda' })
export class MonedaPipe implements PipeTransform {
  transform(valor: number | string | null | undefined): string {
    if (valor === null || valor === undefined || valor === '') {
      return '';
    }
    const numero = Number(valor);
    if (Number.isNaN(numero)) {
      return '';
    }
    const formato = Number.isInteger(numero) ? ENTERO : CON_DECIMALES;
    // Intl usa un espacio duro entre "$" y el número; se normaliza a espacio simple.
    return formato.format(numero).replace(/\s/g, ' ');
  }
}
