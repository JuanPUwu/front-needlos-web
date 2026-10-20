import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { escribirAlmacen, leerAlmacen } from './almacen';

/** Lo recordado caduca a las 12 horas (un borrador de ayer ya no sirve). */
const HORAS_POR_DEFECTO = 12;

interface Guardado<T> {
  valor: T;
  vence: number;
}

/**
 * Memoria del navegador para lo que el usuario estaba haciendo (borradores de formularios,
 * preferencias de pantalla). Vive en localStorage, separada por cuenta y sastrería (otra
 * persona en el mismo computador no ve lo de otra) y con caducidad. Nunca guarda
 * contraseñas ni tokens. Lo que se ve en pantalla (filtros, pestaña, página, popup) va en
 * la URL, no aquí (ver `filtros-url.ts`).
 */
@Injectable({ providedIn: 'root' })
export class Memoria {
  private readonly auth = inject(AuthService, { optional: true });

  guardar<T>(clave: string, valor: T, horas = HORAS_POR_DEFECTO): void {
    const guardado: Guardado<T> = { valor, vence: Date.now() + horas * 3_600_000 };
    escribirAlmacen(localStorage, this.clave(clave), JSON.stringify(guardado));
  }

  leer<T>(clave: string): T | null {
    const texto = leerAlmacen(localStorage, this.clave(clave));
    if (!texto) {
      return null;
    }
    try {
      const guardado = JSON.parse(texto) as Guardado<T>;
      if (guardado.vence < Date.now()) {
        this.olvidar(clave);
        return null;
      }
      return guardado.valor;
    } catch {
      this.olvidar(clave);
      return null;
    }
  }

  olvidar(clave: string): void {
    escribirAlmacen(localStorage, this.clave(clave), null);
  }

  /** `cuenta:sastreria:clave`, o `publico:clave` sin sesión (p. ej. en el registro). */
  private clave(clave: string): string {
    // Los dobles de prueba de AuthService a veces no traen `sesion`.
    const sesion = typeof this.auth?.sesion === 'function' ? this.auth.sesion() : null;
    const ambito = sesion
      ? `${sesion.cuenta.id}:${sesion.sastreria?.tenantId ?? 'global'}`
      : 'publico';
    return `${ambito}:${clave}`;
  }
}
