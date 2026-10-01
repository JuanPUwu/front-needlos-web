import { Component, input, computed } from '@angular/core';

/** Componente de logo de NeedlOS. */
@Component({
  selector: 'app-logo',
  imports: [],
  templateUrl: './logo.html',
  styleUrl: './logo.scss',
  host: {
    '[class.dark]': "variant() === 'dark'",
  },
})
export class Logo {
  /** 'light' = logo blanco (para fondos oscuros). 'dark' = logo negro (para fondos claros). */
  readonly variant = input<'light' | 'dark'>('light');

  protected readonly iconSrc = computed(() =>
    this.variant() === 'dark' ? '/brand/logo/icon-black.svg' : '/brand/logo/icon-white.svg',
  );
  protected readonly rSrc = computed(() =>
    this.variant() === 'dark' ? '/brand/copyright/r-black.svg' : '/brand/copyright/r-white.svg',
  );
}
