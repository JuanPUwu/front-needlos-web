import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Bloqueo } from './shared/ui/bloqueo/bloqueo';
import { ConfirmacionComponent } from './shared/ui/confirmacion/confirmacion';
import { NotificacionesComponent } from './shared/ui/notificaciones/notificaciones';

/**
 * Raíz: las pantallas (router) más tres capas globales — notificaciones, confirmaciones y
 * el bloqueo mientras se procesa una acción (Reglas §12.2).
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificacionesComponent, ConfirmacionComponent, Bloqueo],
  template: `
    <router-outlet />
    <app-notificaciones />
    <app-confirmacion />
    <app-bloqueo />
  `,
})
export class App {
  protected readonly title = signal('needlos-frontend');
}
