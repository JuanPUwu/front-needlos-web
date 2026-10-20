import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Cartera, PrendasClientes, Productividad, Ventas } from '../models/informe.model';

/** Informes (Manual §15). Solo SASTRE_ADMIN; desde y hasta en yyyy-MM-dd (incluidos). */
@Injectable({ providedIn: 'root' })
export class InformeService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/informes`;

  ventas(desde: string, hasta: string): Observable<Ventas> {
    return this.http.get<Ventas>(`${this.base}/ventas`, { params: periodo(desde, hasta) });
  }

  /** Foto de hoy (no depende del periodo). */
  cartera(): Observable<Cartera> {
    return this.http.get<Cartera>(`${this.base}/cartera`);
  }

  productividad(desde: string, hasta: string): Observable<Productividad> {
    return this.http.get<Productividad>(`${this.base}/productividad`, {
      params: periodo(desde, hasta),
    });
  }

  prendasYClientes(desde: string, hasta: string): Observable<PrendasClientes> {
    return this.http.get<PrendasClientes>(`${this.base}/prendas-clientes`, {
      params: periodo(desde, hasta),
    });
  }
}

function periodo(desde: string, hasta: string): HttpParams {
  return new HttpParams().set('desde', desde).set('hasta', hasta);
}
