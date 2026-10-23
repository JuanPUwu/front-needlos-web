import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Pagina } from '../../../core/http/pagina.model';
import { NotificacionBandeja } from '../../../core/notificaciones/bandeja';
import { FiltrosHistorial } from '../models/historial.model';

/** Historial de notificaciones de la persona (últimos 90 días, también las quitadas). */
@Injectable({ providedIn: 'root' })
export class HistorialService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/notificaciones/historial`;

  listar(
    filtros: FiltrosHistorial,
    pagina: number,
    tamano: number,
  ): Observable<Pagina<NotificacionBandeja>> {
    let params = new HttpParams().set('page', pagina).set('size', tamano);
    const valores: [string, string][] = [
      ['buscar', filtros.buscar.trim()],
      ['tipo', filtros.tipo],
      ['desde', filtros.desde],
      ['hasta', filtros.hasta],
    ];
    for (const [clave, valor] of valores) {
      if (valor) {
        params = params.set(clave, valor);
      }
    }
    if (filtros.estado) {
      params = params.set('leida', filtros.estado === 'leidas');
    }
    return this.http.get<Pagina<NotificacionBandeja>>(this.base, { params });
  }
}
