import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Pagina } from '../../../core/http/pagina.model';
import {
  AbonoRequest,
  ActualizarPedidoRequest,
  CrearPedidoRequest,
  EstadoPrenda,
  FiltrosPedidos,
  MotivoAnulacionAbono,
  Pedido,
  PedidoResumen,
  ResumenPedidos,
  Ticket,
} from '../models/pedido.model';

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/pedidos`;

  listar(
    filtros: FiltrosPedidos,
    pagina: number,
    tamano: number,
  ): Observable<Pagina<PedidoResumen>> {
    let params = new HttpParams()
      .set('page', pagina)
      .set('size', tamano)
      .set('sort', filtros.orden);
    const texto: [string, string][] = [
      ['buscar', filtros.buscar.trim()],
      ['estado', filtros.estado],
      ['clienteId', filtros.clienteId],
      ['sastreId', filtros.sastreId],
      ['entregaDesde', filtros.entregaDesde],
      ['entregaHasta', filtros.entregaHasta],
    ];
    for (const [clave, valor] of texto) {
      if (valor) {
        params = params.set(clave, valor);
      }
    }
    if (filtros.vencidos) {
      params = params.set('vencidos', true);
    }
    if (filtros.conSaldo) {
      params = params.set('conSaldo', true);
    }
    if (filtros.sinEntregar) {
      params = params.set('sinEntregar', true);
    }
    return this.http.get<Pagina<PedidoResumen>>(this.base, { params });
  }

  resumen(): Observable<ResumenPedidos> {
    return this.http.get<ResumenPedidos>(`${this.base}/resumen`);
  }

  obtener(id: string): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.base}/${id}`);
  }

  /** `clave`: UUID de la operación; reintentar con la misma no duplica el pedido. */
  crear(req: CrearPedidoRequest, clave: string): Observable<Pedido> {
    return this.http.post<Pedido>(this.base, req, { headers: idempotencia(clave) });
  }

  actualizar(id: string, version: number, req: ActualizarPedidoRequest): Observable<Pedido> {
    const headers = new HttpHeaders({ 'If-Match': `"${version}"` });
    return this.http.put<Pedido>(`${this.base}/${id}`, req, { headers });
  }

  cambiarEstado(id: string, prendaId: string, estado: EstadoPrenda): Observable<Pedido> {
    return this.http.patch<Pedido>(`${this.base}/${id}/prendas/${prendaId}/estado`, { estado });
  }

  /** Varias prendas al mismo estado en un solo paso (todas o ninguna). */
  cambiarEstadoVarias(id: string, prendaIds: string[], estado: EstadoPrenda): Observable<Pedido> {
    return this.http.patch<Pedido>(`${this.base}/${id}/prendas/estado`, { prendaIds, estado });
  }

  asignarSastre(id: string, prendaId: string, sastreId: string | null): Observable<Pedido> {
    return this.http.patch<Pedido>(`${this.base}/${id}/prendas/${prendaId}/sastre`, { sastreId });
  }

  entregar(id: string, prendaIds: string[]): Observable<Pedido> {
    return this.http.patch<Pedido>(`${this.base}/${id}/entregar`, { prendaIds });
  }

  anular(id: string, razon: string): Observable<Pedido> {
    return this.http.patch<Pedido>(`${this.base}/${id}/anular`, { razon });
  }

  registrarAbono(id: string, req: AbonoRequest, clave: string): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.base}/${id}/abonos`, req, {
      headers: idempotencia(clave),
    });
  }

  anularAbono(abonoId: string, motivo: MotivoAnulacionAbono, razon: string): Observable<Pedido> {
    return this.http.patch<Pedido>(`${environment.apiUrl}/api/v1/abonos/${abonoId}/anular`, {
      motivo,
      razon,
    });
  }

  ticket(id: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.base}/${id}/ticket`);
  }
}

function idempotencia(clave: string): HttpHeaders {
  return new HttpHeaders({ 'Idempotency-Key': clave });
}
