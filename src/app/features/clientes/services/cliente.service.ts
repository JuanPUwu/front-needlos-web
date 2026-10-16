import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Pagina } from '../../../core/http/pagina.model';
import { Cliente, FiltrosClientes, GuardarClienteRequest } from '../models/cliente.model';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/clientes`;

  listar(filtros: FiltrosClientes, pagina: number, tamano: number): Observable<Pagina<Cliente>> {
    let params = new HttpParams()
      .set('page', pagina)
      .set('size', tamano)
      .set('sort', filtros.orden);
    if (filtros.buscar.trim()) {
      params = params.set('buscar', filtros.buscar.trim());
    }
    if (filtros.desde) {
      params = params.set('desde', filtros.desde);
    }
    if (filtros.hasta) {
      params = params.set('hasta', filtros.hasta);
    }
    return this.http.get<Pagina<Cliente>>(this.base, { params });
  }

  /** Cliente dueño del teléfono (el teléfono es único). 404 si nadie lo tiene. */
  porTelefono(telefono: string): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.base}/por-telefono/${encodeURIComponent(telefono)}`);
  }

  crear(req: GuardarClienteRequest): Observable<Cliente> {
    return this.http.post<Cliente>(this.base, req);
  }

  /** Envía la versión leída en If-Match: si otra persona lo editó antes, responde 409. */
  actualizar(id: string, version: number, req: GuardarClienteRequest): Observable<Cliente> {
    const headers = new HttpHeaders({ 'If-Match': `"${version}"` });
    return this.http.put<Cliente>(`${this.base}/${id}`, req, { headers });
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
