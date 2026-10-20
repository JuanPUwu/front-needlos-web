import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Notificaciones as NotificacionesService } from '../../../core/ui/notificaciones';
import { Icono } from '../icono/icono';

/** Pila de notificaciones temporales (una sola instancia, en la raíz de la app). */
@Component({
  selector: 'app-notificaciones',
  imports: [Icono],
  templateUrl: './notificaciones.html',
  styleUrl: './notificaciones.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificacionesComponent {
  readonly servicio = inject(NotificacionesService);
}
