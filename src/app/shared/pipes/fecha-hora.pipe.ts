import { Pipe, PipeTransform } from '@angular/core';
import { formatDate } from '@angular/common';

/** Zona horaria de Colombia (America/Bogota, sin horario de verano). */
const ZONA_COLOMBIA = '-0500';

/**
 * Fecha y hora en formato dd/MM/yyyy HH:mm (o solo HH:mm con `'hora'`), hora de Colombia
 * (Reglas §12.2). El backend entrega fechas en UTC; la conversion ocurre solo al mostrar.
 */
@Pipe({ name: 'fechaHora' })
export class FechaHoraPipe implements PipeTransform {
  transform(
    valor: string | Date | null | undefined,
    parte: 'completa' | 'hora' = 'completa',
  ): string {
    const formato = parte === 'hora' ? 'HH:mm' : 'dd/MM/yyyy HH:mm';
    return valor ? formatDate(valor, formato, 'en-US', ZONA_COLOMBIA) : '';
  }
}
