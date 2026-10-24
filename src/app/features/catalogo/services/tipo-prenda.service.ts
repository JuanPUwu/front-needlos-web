import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { GuardarTipoPrendaRequest, PrecioSugerido, TipoPrenda } from '../models/tipo-prenda.model';

@Injectable({ providedIn: 'root' })
export class TipoPrendaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/tipos-prenda`;

  /** Activos (para pedidos) o todos, incluidos los desactivados (para administrar). */
  listar(incluirInactivos: boolean): Observable<TipoPrenda[]> {
    const params = new HttpParams().set('todos', incluirInactivos);
    return this.http.get<TipoPrenda[]>(this.base, { params });
  }

  crear(req: GuardarTipoPrendaRequest): Observable<TipoPrenda> {
    return this.http.post<TipoPrenda>(this.base, req);
  }

  /** Envía la versión leída en If-Match: si otra persona lo editó antes, responde 409. */
  actualizar(id: string, version: number, req: GuardarTipoPrendaRequest): Observable<TipoPrenda> {
    const headers = new HttpHeaders({ 'If-Match': `"${version}"` });
    return this.http.put<TipoPrenda>(`${this.base}/${id}`, req, { headers });
  }

  desactivar(id: string): Observable<TipoPrenda> {
    return this.http.patch<TipoPrenda>(`${this.base}/${id}/desactivar`, null);
  }

  reactivar(id: string): Observable<TipoPrenda> {
    return this.http.patch<TipoPrenda>(`${this.base}/${id}/reactivar`, null);
  }

  /** Solo si nunca se usó en un pedido; si ya se usó responde TIPO_PRENDA_EN_USO (409). */
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /** El precio base del catálogo (lo que se precarga al elegir el tipo en un pedido). */
  precioSugerido(id: string): Observable<PrecioSugerido> {
    return this.http.get<PrecioSugerido>(`${this.base}/${id}/precio-sugerido`);
  }
}
