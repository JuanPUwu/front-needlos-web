import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Placeholder reutilizable para las secciones aún no construidas. El título lo toma
 * de la data de la ruta (`data: { titulo: '...' }`).
 */
@Component({
  selector: 'app-seccion-pendiente',
  templateUrl: './seccion-pendiente.html',
  styleUrl: './seccion-pendiente.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeccionPendiente {
  private readonly route = inject(ActivatedRoute);
  readonly titulo = (this.route.snapshot.data['titulo'] as string) ?? 'Sección';
}
