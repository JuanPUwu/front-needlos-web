import { Pipe, PipeTransform } from '@angular/core';

/**
 * Fecha sin hora en formato dd/MM/yyyy (Reglas §12.2). Para valores "yyyy-MM-dd" del
 * backend (LocalDate): se reordena el texto, sin pasar por Date, para que la zona
 * horaria no la corra un día.
 */
@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    const partes = valor?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : '';
  }
}
