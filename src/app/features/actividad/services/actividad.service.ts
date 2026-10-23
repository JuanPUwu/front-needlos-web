import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Pagina } from '../../../core/http/pagina.model';
import { EntradaActividad, FiltrosActividad } from '../models/actividad.model';

/** Registro de actividad de la sastrería (solo SASTRE_ADMIN). */
@Injectable({ providedIn: 'root' })
export class ActividadService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/actividad`;

  listar(
    filtros: FiltrosActividad,
    pagina: number,
    tamano: number,
  ): Observable<Pagina<EntradaActividad>> {
    let params = new HttpParams().set('page', pagina).set('size', tamano);
    const valores: [string, string][] = [
      ['buscar', filtros.buscar.trim()],
      ['categoria', filtros.categoria],
      ['persona', filtros.persona],
      ['desde', filtros.desde],
      ['hasta', filtros.hasta],
    ];
    for (const [clave, valor] of valores) {
      if (valor) {
        params = params.set(clave, valor);
      }
    }
    return this.http.get<Pagina<EntradaActividad>>(this.base, { params });
  }
}
