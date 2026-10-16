import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FechaHoraPipe } from '../../pipes/fecha-hora.pipe';
import { FechaPipe } from '../../pipes/fecha.pipe';
import { MonedaPipe } from '../../pipes/moneda.pipe';

/** Datos del ticket (alineado con GET /api/v1/pedidos/{id}/ticket). */
export interface TicketDatos {
  sastreria: {
    nombre: string;
    nit: string | null;
    direccion: string | null;
    telefono: string | null;
  };
  numero: string;
  fecha: string;
  fechaEntrega: string;
  cliente: { nombre: string; apellido: string; telefono: string };
  prendas: {
    tipoPrenda: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
  subtotal: number;
  descuento: number;
  total: number;
  abonos: { fecha: string; metodo: string; monto: number }[];
  abonado: number;
  saldo: number;
  anulado: boolean;
  emitido: string;
}

const METODOS: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  NEQUI: 'Nequi',
  DAVIPLATA: 'Daviplata',
  BRE_B: 'Bre-B',
  OTRO: 'Otro',
};

/**
 * Ticket del pedido, diseñado para impresora térmica de 80 mm (también se ve bien en
 * pantalla). Solo presenta: los datos llegan por `datos`.
 */
@Component({
  selector: 'app-ticket',
  imports: [FechaPipe, FechaHoraPipe, MonedaPipe],
  templateUrl: './ticket.html',
  styleUrl: './ticket.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketComponent {
  readonly datos = input.required<TicketDatos>();

  metodo(valor: string): string {
    return METODOS[valor] ?? valor;
  }
}
