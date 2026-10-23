import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { Dueno } from '../../models/plataforma.model';

/**
 * Dueños de sastrerías para el SuperAdmin: tabla de anchos proporcionales (nunca se desplaza a lo
 * ancho) que pasa a tarjetas cuando no cabe (Reglas §12.2). Solo datos de contacto y de uso.
 */
@Component({
  selector: 'app-duenos-tabla',
  imports: [FechaHoraPipe],
  templateUrl: './duenos-tabla.html',
  styleUrl: './duenos-tabla.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DuenosTabla {
  readonly duenos = input.required<Dueno[]>();
  readonly cargando = input(false);
}
