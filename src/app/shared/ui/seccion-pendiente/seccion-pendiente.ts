import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Encabezado } from '../encabezado/encabezado';
import { NombreIcono } from '../icono/icono';

/**
 * Placeholder reutilizable para las secciones aún no construidas. El título lo toma
 * y el ícono de la data de la ruta (`data: { titulo: '...', icono: '...' }`).
 */
@Component({
  selector: 'app-seccion-pendiente',
  imports: [Encabezado],
  templateUrl: './seccion-pendiente.html',
  styleUrl: './seccion-pendiente.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeccionPendiente {
  private readonly route = inject(ActivatedRoute);
  readonly titulo = (this.route.snapshot.data['titulo'] as string) ?? 'Sección';
  readonly icono = (this.route.snapshot.data['icono'] as NombreIcono | undefined) ?? null;
}
