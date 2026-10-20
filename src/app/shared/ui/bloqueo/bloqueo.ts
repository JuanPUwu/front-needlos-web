import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Actividad } from '../../../core/ui/actividad';
import { Costura } from '../costura/costura';

/**
 * Mientras se procesa una acción (guardar, crear, iniciar sesión…), cubre toda la pantalla
 * y bloquea cualquier otro clic o tecla. El indicador se ve a los 300 ms, para no
 * parpadear en acciones rápidas; el bloqueo es inmediato.
 */
@Component({
  selector: 'app-bloqueo',
  imports: [Costura],
  template: `
    @if (actividad.ocupado()) {
      <div class="bloqueo" role="status" aria-live="assertive" aria-busy="true">
        <div class="bloqueo__caja">
          <app-costura class="bloqueo__costura" />
          <span class="bloqueo__texto">Procesando...</span>
        </div>
      </div>
    }
  `,
  styleUrl: './bloqueo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'bloquearTeclado($event)' },
})
export class Bloqueo {
  readonly actividad = inject(Actividad);

  /** Mientras procesa, ninguna tecla (Enter, Escape…) dispara otra acción. */
  bloquearTeclado(evento: KeyboardEvent): void {
    if (this.actividad.ocupado()) {
      evento.preventDefault();
      evento.stopPropagation();
    }
  }
}
