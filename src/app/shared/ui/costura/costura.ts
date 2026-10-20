import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Indicador de carga de la app (dueño 2026-10-20): una aguja con hilo que sube y baja mientras
 * la puntada avanza, en lugar del círculo que gira. Toma el tamaño que le dé quien lo use.
 */
@Component({
  selector: 'app-costura',
  template: `
    <svg class="costura" viewBox="0 0 48 32" aria-hidden="true">
      <path class="costura__tela" d="M2 24H46" />
      <path class="costura__puntadas" d="M2 24H46" />
      <g class="costura__aguja">
        <path class="costura__hilo" d="M28.2 6C20 1 10 10 13 24" />
        <path class="costura__cuerpo" d="M29 3L22.5 27" />
        <circle class="costura__ojo" cx="28.4" cy="5.6" r="0.9" />
      </g>
    </svg>
  `,
  styleUrl: './costura.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Costura {}
