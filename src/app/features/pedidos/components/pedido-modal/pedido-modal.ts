import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { Pedido } from '../../models/pedido.model';
import { PedidoDetalle } from '../../pages/pedido-detalle/pedido-detalle';
import { PedidoForm } from '../../pages/pedido-form/pedido-form';

/**
 * Popup del pedido sobre el listado: sin id es "Nuevo pedido"; con id muestra el detalle y,
 * con "Editar", el formulario de edición en el mismo popup. Se cierra con ✕, tocando el fondo o con Escape (en edición,
 * Escape vuelve al detalle). Devuelve el foco a donde estaba al cerrarse.
 */
@Component({
  selector: 'app-pedido-modal',
  imports: [PedidoDetalle, PedidoForm],
  templateUrl: './pedido-modal.html',
  styleUrl: './pedido-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'alEscape()' },
})
export class PedidoModal implements OnDestroy {
  /** null = nuevo pedido. */
  readonly pedidoId = input<string | null>(null);
  /** Se creó un pedido (el listado abre su detalle). */
  readonly creado = output<Pedido>();
  readonly cerrado = output<void>();
  /** El pedido cambió: el listado debe recargarse. */
  readonly cambio = output<Pedido>();
  readonly verCliente = output<{ id: string; nombre: string }>();
  /** Abre directamente en edición (viene de `?modo=editar`: sobrevive a la recarga). */
  readonly editando = input(false);
  /** Avisa el cambio entre detalle y edición, para anotarlo en la URL. */
  readonly modoCambiado = output<boolean>();

  readonly modo = linkedSignal<'ver' | 'editar'>(() => (this.editando() ? 'editar' : 'ver'));

  private readonly notificaciones = inject(Notificaciones);
  private readonly caja = viewChild.required<ElementRef<HTMLElement>>('caja');
  private readonly focoPrevio = document.activeElement as HTMLElement | null;

  constructor() {
    afterNextRender(() => this.caja().nativeElement.focus());
  }

  ngOnDestroy(): void {
    this.focoPrevio?.focus?.();
  }

  cerrar(): void {
    this.cerrado.emit();
  }

  editar(): void {
    this.ponerModo('editar');
    this.caja().nativeElement.scrollTop = 0;
  }

  ponerModo(modo: 'ver' | 'editar'): void {
    this.modo.set(modo);
    this.modoCambiado.emit(modo === 'editar');
  }

  alGuardar(pedido: Pedido): void {
    this.ponerModo('ver');
    this.notificaciones.exito(`Pedido ${pedido.numero} actualizado.`);
    this.cambio.emit(pedido);
  }

  alEscape(): void {
    if (this.modo() === 'editar') {
      this.ponerModo('ver');
    } else {
      this.cerrar();
    }
  }
}
