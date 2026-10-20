import { Pipe, PipeTransform } from '@angular/core';

const FORMATO = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Cantidad con hasta 2 decimales, solo cuando aportan (Reglas §12.2).
 * 12.5 -> "12,5" · 1250 -> "1.250" · 3 -> "3" · null -> "".
 */
@Pipe({ name: 'cantidad' })
export class CantidadPipe implements PipeTransform {
  transform(valor: number | string | null | undefined): string {
    if (valor === null || valor === undefined || valor === '') {
      return '';
    }
    const numero = Number(valor);
    return Number.isNaN(numero) ? '' : FORMATO.format(numero);
  }
}
