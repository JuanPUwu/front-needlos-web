import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { Confirmacion } from '../../../core/ui/confirmacion';
import { Icono } from '../icono/icono';

/**
 * Popup de confirmación o de aviso (una sola instancia, en la raíz de la app). Enfoca
 * "Cancelar" al abrirse (lo seguro ante un Enter accidental) o "Aceptar" en un aviso; Escape o
 * tocar el fondo cancelan (o cierran el aviso).
 */
@Component({
  selector: 'app-confirmacion',
  imports: [Icono],
  templateUrl: './confirmacion.html',
  styleUrl: './confirmacion.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'alEscape()' },
})
export class ConfirmacionComponent {
  readonly servicio = inject(Confirmacion);
  private readonly primero = viewChild<ElementRef<HTMLButtonElement>>('primero');

  constructor() {
    effect(() => {
      if (this.servicio.actual()) {
        queueMicrotask(() => this.primero()?.nativeElement.focus());
      }
    });
  }

  alEscape(): void {
    if (this.servicio.actual()) {
      this.servicio.responder(false);
    }
  }
}
