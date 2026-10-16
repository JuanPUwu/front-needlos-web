import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { mensajeDeError } from '../../../../core/http/api-error';
import { TicketComponent } from '../../../../shared/ui/ticket/ticket';
import { Ticket } from '../../models/pedido.model';
import { PedidoService } from '../../services/pedido.service';

/**
 * Ticket del pedido en una página sin barra lateral, lista para imprimir (o reimprimir).
 * Al imprimir solo sale el ticket.
 */
@Component({
  selector: 'app-ticket-pagina',
  imports: [RouterLink, TicketComponent],
  templateUrl: './ticket-pagina.html',
  styleUrl: './ticket-pagina.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketPagina implements OnInit {
  private readonly service = inject(PedidoService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  readonly ticket = signal<Ticket | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.service
      .ticket(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (t) => this.ticket.set(t),
        error: (err: unknown) =>
          this.error.set(mensajeDeError(err, 'No se pudo cargar el ticket.')),
      });
  }

  imprimir(): void {
    window.print();
  }
}
