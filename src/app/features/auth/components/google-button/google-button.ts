import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  output,
  viewChild,
} from '@angular/core';
import { environment } from '../../../../../environments/environment';

/** Parte de la API de Google Identity Services que se usa aqui. */
interface GoogleIdentity {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (respuesta: { credential: string }) => void;
      }): void;
      renderButton(contenedor: HTMLElement, opciones: Record<string, string | number>): void;
    };
  };
}

/**
 * Boton "Continuar con Google" (Google Identity Services). Renderiza el boton
 * oficial de Google y emite el ID token cuando el usuario se autentica.
 * El script de GIS se carga en index.html.
 */
@Component({
  selector: 'app-google-button',
  template: '<div #contenedor class="google-button"></div>',
  styles: '.google-button { display: flex; justify-content: center; min-height: 44px; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleButton implements AfterViewInit {
  private static readonly MAX_INTENTOS = 50;

  private readonly contenedor = viewChild.required<ElementRef<HTMLElement>>('contenedor');

  /** Emite el ID token de Google al autenticarse. */
  readonly credencial = output<string>();

  ngAfterViewInit(): void {
    this.inicializar(0);
  }

  private inicializar(intentos: number): void {
    const google = (window as unknown as { google?: GoogleIdentity }).google;

    if (!google?.accounts?.id) {
      // El script de GIS puede tardar en cargar; se reintenta brevemente.
      if (intentos < GoogleButton.MAX_INTENTOS) {
        setTimeout(() => this.inicializar(intentos + 1), 100);
      }
      return;
    }

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (respuesta) => this.credencial.emit(respuesta.credential),
    });

    google.accounts.id.renderButton(this.contenedor().nativeElement, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: 320,
      locale: 'es',
    });
  }
}
