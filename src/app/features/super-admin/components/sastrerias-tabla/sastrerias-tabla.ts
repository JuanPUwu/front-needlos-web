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
  /** Mientras carga por primera vez: las filas son de ejemplo y se pintan en gris (mide igual). */
  readonly esqueleto = input(false);
  readonly abrir = output<SastreriaPlataforma>();

  readonly etiquetaEstado = ETIQUETA_ESTADO_PLATAFORMA;

  elegir(s: SastreriaPlataforma): void {
    if (!this.esqueleto()) {
      this.abrir.emit(s);
    }
  }
}

/** Filas de ejemplo para el esqueleto del listado (mismo marcado que las reales). */
export const SASTRERIAS_ESQUELETO: SastreriaPlataforma[] = Array.from({ length: 6 }, (_, i) => ({
  id: `esqueleto-${i}`,
  nombre: 'Nombre de la sastrería',
  plan: 'DEMO',
  vence: '2026-01-01T05:00:00Z',
  estado: 'PRUEBA',
  activo: true,
  registro: '2026-01-01T05:00:00Z',
  ultimoAcceso: '2026-01-01T05:00:00Z',
  pedidos: 10,
  personas: 10,
  admin: 'Admin',
  adminEmail: 'correo@ejemplo.com',
  telefono: null,
}));
