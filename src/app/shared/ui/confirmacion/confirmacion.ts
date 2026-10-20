import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { Confirmacion } from '../../../core/ui/confirmacion';

/**
 * Popup de confirmación (una sola instancia, en la raíz de la app). Enfoca "Cancelar" al
 * abrirse (lo seguro ante un Enter accidental); Escape o tocar el fondo cancelan.
 */
@Component({
  selector: 'app-confirmacion',
  templateUrl: './confirmacion.html',
  styleUrl: './confirmacion.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'alEscape()' },
})
export class ConfirmacionComponent {
  readonly servicio = inject(Confirmacion);
  private readonly cancelar = viewChild<ElementRef<HTMLButtonElement>>('cancelar');

  constructor() {
    effect(() => {
      if (this.servicio.actual()) {
        queueMicrotask(() => this.cancelar()?.nativeElement.focus());
      }
    });
  }

  alEscape(): void {
    if (this.servicio.actual()) {
      this.servicio.responder(false);
    }
  }
}
