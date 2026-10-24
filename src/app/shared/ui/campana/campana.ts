import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { Notificaciones } from '../../../core/ui/notificaciones';
import { Router, RouterLink } from '@angular/router';
import { Bandeja, NotificacionBandeja } from '../../../core/notificaciones/bandeja';
import { FechaHoraPipe } from '../../pipes/fecha-hora.pipe';
import { Icono } from '../icono/icono';
import { Esqueleto } from '../esqueleto/esqueleto';
import { Vacio } from '../vacio/vacio';

/**
 * Campana de notificaciones (Manual §19.1): la última acción del encabezado de cada sección
 * (`app-encabezado`), en todas las pantallas. Muestra cuántas hay sin leer y, al abrirla, la bandeja con lo más
 * reciente primero. Tocar un aviso lo marca leído y lleva a donde corresponde; la ✕ lo quita de la
 * campana y "Limpiar todo" la vacía (todo sigue en el historial, `/notificaciones`).
 */
@Component({
  selector: 'app-campana',
  imports: [Esqueleto, Vacio, Icono, FechaHoraPipe, RouterLink],
  templateUrl: './campana.html',
  styleUrl: './campana.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'alClicFuera($event)',
    '(document:keydown.escape)': 'cerrar()',
    '(window:resize)': 'cerrar()',
    '[class.cmp--barra]': "variante() === 'barra'",
  },
})
export class Campana {
  readonly bandeja = inject(Bandeja);
  /** Los avisos temporales salen en una barra a la izquierda de la campana (dueño 2026-10-23). */
  readonly avisos = inject(Notificaciones);
  private readonly router = inject(Router);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * `encabezado`: cuadrada de 48 px como el "+" (escritorio). `barra`: igual al botón del menú
   * hamburguesa (44 px), para la barra superior de tablet/teléfono.
   */
  readonly variante = input<'encabezado' | 'barra'>('encabezado');

  readonly abierta = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(this.avisos.registrarCampana());
  }

  alternar(): void {
    const abrir = !this.abierta();
    if (abrir) {
      this.bandeja.cargar();
    }
    this.abierta.set(abrir);
  }

  cerrar(): void {
    this.abierta.set(false);
  }

  elegir(n: NotificacionBandeja): void {
    this.bandeja.marcarLeida(n);
    if (n.enlace) {
      this.cerrar();
      this.router.navigateByUrl(n.enlace);
    }
  }

  alClicFuera(evento: MouseEvent): void {
    if (this.abierta() && !this.elemento.nativeElement.contains(evento.target as Node)) {
      this.cerrar();
    }
  }
}
