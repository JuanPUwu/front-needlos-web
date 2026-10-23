import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { ETIQUETA_ESTADO_PLATAFORMA, SastreriaPlataforma } from '../../models/plataforma.model';

/**
 * Listado de sastrerías del SuperAdmin: tabla de anchos proporcionales (nunca se desplaza a lo
 * ancho) que pasa a tarjetas cuando no cabe (Reglas §12.2). El color de la fila dice su estado;
 * cada fila abre la sastrería.
 */
@Component({
  selector: 'app-sastrerias-tabla',
  imports: [FechaHoraPipe],
  templateUrl: './sastrerias-tabla.html',
  styleUrl: './sastrerias-tabla.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SastreriasTabla {
  readonly sastrerias = input.required<SastreriaPlataforma[]>();
  readonly cargando = input(false);
  readonly abrir = output<SastreriaPlataforma>();

  readonly etiquetaEstado = ETIQUETA_ESTADO_PLATAFORMA;

  elegir(s: SastreriaPlataforma): void {
    this.abrir.emit(s);
  }
}
