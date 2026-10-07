import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
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
 *
 * El ancho del boton se ajusta al contenedor (GIS solo acepta un numero de px,
 * no porcentajes) y se re-renderiza al cambiar el tamano para no desbordar en
 * moviles.
 */
@Component({
  selector: 'app-google-button',
  template: '<div #contenedor class="google-button"></div>',
  styles: ':host { display: block; } .google-button { display: flex; justify-content: center; min-height: 44px; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleButton implements AfterViewInit, OnDestroy {
  /** Ancho maximo que admite el boton de GIS. */
  private static readonly ANCHO_MAX = 400;
  private static readonly MAX_INTENTOS = 50;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly contenedor = viewChild.required<ElementRef<HTMLElement>>('contenedor');

  /** Emite el ID token de Google al autenticarse. */
  readonly credencial = output<string>();

  private google: GoogleIdentity | null = null;
  private observador?: ResizeObserver;
  private anchoActual = 0;

  ngAfterViewInit(): void {
    this.inicializar(0);
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
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

    this.google = google;
    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (respuesta) => this.credencial.emit(respuesta.credential),
    });

    this.renderizar();

    // Re-renderiza cuando cambia el ancho disponible (rotacion, resize).
    this.observador = new ResizeObserver(() => this.renderizar());
    this.observador.observe(this.host.nativeElement);
  }

  private renderizar(): void {
    if (!this.google) {
      return;
    }

    const ancho = Math.min(
      GoogleButton.ANCHO_MAX,
      Math.floor(this.host.nativeElement.clientWidth),
    );

    // Evita re-renderizar sin cambios reales de ancho.
    if (ancho <= 0 || ancho === this.anchoActual) {
      return;
    }
    this.anchoActual = ancho;

    const contenedor = this.contenedor().nativeElement;
    contenedor.replaceChildren();

    this.google.accounts.id.renderButton(contenedor, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: ancho,
      locale: 'es',
    });
  }
}
