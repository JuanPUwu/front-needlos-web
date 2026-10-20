import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Bandeja, NotificacionBandeja } from '../../../../core/notificaciones/bandeja';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { Icono } from '../../../../shared/ui/icono/icono';

/** Mientras carga: avisos de ejemplo con el mismo marcado, en gris. */
const ESQUELETO: NotificacionBandeja[] = Array.from({ length: 4 }, (_, i) => ({
  id: `esqueleto-${i}`,
  tipo: 'PROPIA',
  tono: 'INFO',
  titulo: 'Texto de la notificación de ejemplo',
  enlace: null,
  leida: true,
  fecha: '2026-01-01T05:00:00Z',
}));

/**
 * Campana de notificaciones (Manual §19.1): arriba a la derecha en escritorio y en la barra
 * superior de tablet/teléfono. Muestra cuántas hay sin leer y, al abrirla, la bandeja con lo más
 * reciente primero. Tocar un aviso lo marca leído y lleva a donde corresponde.
 */
@Component({
  selector: 'app-campana',
  imports: [Icono, FechaHoraPipe],
  templateUrl: './campana.html',
  styleUrl: './campana.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'alClicFuera($event)',
    '(document:keydown.escape)': 'cerrar()',
    '(window:resize)': 'cerrar()',
  },
})
export class Campana {
  readonly bandeja = inject(Bandeja);
  private readonly router = inject(Router);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly abierta = signal(false);
  readonly esqueleto = ESQUELETO;

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
