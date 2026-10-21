import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ActualizarSastreriaRequest, Sastreria } from '../models/sastreria.model';
import { ResultadoImportacion, TipoImportacion, VistaPrevia } from '../models/importacion.model';

@Injectable({ providedIn: 'root' })
export class SastreriaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/sastreria`;

  obtener(): Observable<Sastreria> {
    return this.http.get<Sastreria>(this.base);
  }

  actualizar(req: ActualizarSastreriaRequest): Observable<Sastreria> {
    return this.http.patch<Sastreria>(this.base, req);
  }

  /**
   * Elimina la sastrería (Manual §16.1): nadie entra desde ya; se conserva 90 días. Devuelve
   * hasta cuándo se puede recuperar.
   */
  eliminar(confirmacion: string, nombre: string): Observable<{ seBorraEl: string }> {
    return this.http.post<{ seBorraEl: string }>(`${this.base}/eliminacion`, {
      confirmacion,
      nombre,
    });
  }

  /** Plantilla CSV de un tipo de dato para importar (Manual §16.1). */
  plantilla(tipo: TipoImportacion): Observable<Blob> {
    return this.http.get(`${this.base}/importacion/${tipo}/plantilla`, { responseType: 'blob' });
  }

  /** Revisa el archivo sin guardar nada. */
  vistaPrevia(tipo: TipoImportacion, contenido: string): Observable<VistaPrevia> {
    return this.http.post<VistaPrevia>(`${this.base}/importacion/${tipo}/vista-previa`, {
      contenido,
    });
  }

  /** Importa las filas nuevas (todo o nada). */
  importar(tipo: TipoImportacion, contenido: string): Observable<ResultadoImportacion> {
    return this.http.post<ResultadoImportacion>(`${this.base}/importacion/${tipo}`, {
      contenido,
    });
  }

  /**
   * El .zip con toda la información (Manual §16.1). Si falla, el error llega como Blob: se lee
   * para que el mensaje del servidor se muestre igual que en las demás peticiones.
   */
  exportar(confirmacion: string): Observable<Blob> {
    return this.http
      .post(`${this.base}/exportacion`, { confirmacion }, { responseType: 'blob' })
      .pipe(
        catchError((err: unknown) =>
          err instanceof HttpErrorResponse && err.error instanceof Blob
            ? from(err.error.text()).pipe(
                switchMap((texto) =>
                  throwError(
                    () =>
                      new HttpErrorResponse({
                        error: leerJson(texto),
                        status: err.status,
                        statusText: err.statusText,
                        url: err.url ?? undefined,
                      }),
                  ),
                ),
              )
            : throwError(() => err),
        ),
      );
  }
}

function leerJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}
