import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Pagina } from '../../../core/http/pagina.model';
import { CambioGasto, FiltrosGastos, Gasto, GuardarGastoRequest } from '../models/gasto.model';

/** Gastos (egresos) de la sastrería. Solo SASTRE_ADMIN. */
@Injectable({ providedIn: 'root' })
export class GastoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/gastos`;

  listar(filtros: FiltrosGastos, pagina: number, tamano: number): Observable<Pagina<Gasto>> {
    let params = new HttpParams()
      .set('page', pagina)
      .set('size', tamano)
      .set('sort', filtros.orden);
    const texto: [string, string][] = [
      ['buscar', filtros.buscar.trim()],
      ['metodo', filtros.metodo],
      ['desde', filtros.desde],
      ['hasta', filtros.hasta],
    ];
    for (const [clave, valor] of texto) {
      if (valor) {
        params = params.set(clave, valor);
      }
    }
    return this.http.get<Pagina<Gasto>>(this.base, { params });
  }

  obtener(id: string): Observable<Gasto> {
    return this.http.get<Gasto>(`${this.base}/${id}`);
  }

  /** `clave`: Idempotency-Key (se reusa al reintentar para no duplicar). */
  crear(req: GuardarGastoRequest, clave: string): Observable<Gasto> {
    return this.http.post<Gasto>(this.base, req, {
      headers: new HttpHeaders({ 'Idempotency-Key': clave }),
    });
  }

  corregir(id: string, version: number, req: GuardarGastoRequest): Observable<Gasto> {
    return this.http.put<Gasto>(`${this.base}/${id}`, req, {
      headers: new HttpHeaders({ 'If-Match': String(version) }),
    });
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  historial(id: string): Observable<CambioGasto[]> {
    return this.http.get<CambioGasto[]>(`${this.base}/${id}/historial`);
  }
}
