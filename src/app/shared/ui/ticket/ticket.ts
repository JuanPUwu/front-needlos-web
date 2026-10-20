import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
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
  host: { '[class.ticket-host--llenar]': 'llenar()' },
})
export class TicketComponent {
  readonly datos = input.required<TicketDatos>();
  /**
   * Vista previa: el ticket conserva su forma (72 mm) y se amplía proporcionalmente, como
   * con zoom, hasta llenar el espacio de su contenedor.
   */
  readonly llenar = input(false);

  /** Factor de ampliación de la vista previa (1 = tamaño real). */
  readonly escala = signal(1);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly papel = viewChild.required<ElementRef<HTMLElement>>('papel');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!this.llenar() || typeof ResizeObserver === 'undefined') {
        return;
      }
      // offsetWidth/offsetHeight no cambian con transform: miden el ticket a tamaño real.
      const ajustar = () => {
        const caja = this.host.nativeElement;
        const papel = this.papel().nativeElement;
        if (!papel.offsetWidth || !papel.offsetHeight) {
          return;
        }
        this.escala.set(
          Math.max(
            1,
            Math.min(caja.clientWidth / papel.offsetWidth, caja.clientHeight / papel.offsetHeight),
          ),
        );
      };
      const observador = new ResizeObserver(ajustar);
      observador.observe(this.host.nativeElement);
      observador.observe(this.papel().nativeElement);
      destroyRef.onDestroy(() => observador.disconnect());
    });
  }

  metodo(valor: string): string {
    return METODOS[valor] ?? valor;
  }
}
