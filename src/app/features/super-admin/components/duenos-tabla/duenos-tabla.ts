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
  /** Mientras carga por primera vez: filas de ejemplo en gris (mide igual). */
  readonly esqueleto = input(false);
}

/** Filas de ejemplo para el esqueleto del listado (mismo marcado que las reales). */
export const DUENOS_ESQUELETO: Dueno[] = Array.from({ length: 6 }, (_, i) => ({
  id: `esqueleto-${i}`,
  nombre: 'Nombre',
  apellido: 'Apellido',
  email: 'correo@ejemplo.com',
  telefono: '3000000000',
  verificada: true,
  registro: '2026-01-01T05:00:00Z',
  ultimoAcceso: '2026-01-01T05:00:00Z',
  sastrerias: ['Nombre de la sastrería'],
}));
