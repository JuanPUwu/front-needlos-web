import { Pipe, PipeTransform } from '@angular/core';
import { formatDate } from '@angular/common';

/** Zona horaria de Colombia (America/Bogota, sin horario de verano). */
const ZONA_COLOMBIA = '-0500';

/**
 * Fecha y hora en formato dd/MM/yyyy HH:mm, hora de Colombia (Reglas §12.2).
 * El backend entrega fechas en UTC; la conversion ocurre solo al mostrar.
 */
@Pipe({ name: 'fechaHora' })
export class FechaHoraPipe implements PipeTransform {
  transform(valor: string | Date | null | undefined): string {
    return valor ? formatDate(valor, 'dd/MM/yyyy HH:mm', 'en-US', ZONA_COLOMBIA) : '';
  }
}
