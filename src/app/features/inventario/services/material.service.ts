import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Pagina } from '../../../core/http/pagina.model';
import {
  ActualizarMaterialRequest,
  CrearMaterialRequest,
  FiltrosMateriales,
  Material,
  MovimientoMaterial,
  RegistrarMovimientoRequest,
} from '../models/material.model';

/** Inventario de materiales. Ver: todo el equipo; cambiar: permiso GESTIONAR_INVENTARIO. */
@Injectable({ providedIn: 'root' })
export class MaterialService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/materiales`;

  listar(filtros: FiltrosMateriales, pagina: number, tamano: number): Observable<Pagina<Material>> {
    let params = new HttpParams()
      .set('page', pagina)
      .set('size', tamano)
      .set('sort', filtros.orden)
      .set('estado', filtros.estado);
    if (filtros.buscar.trim()) {
      params = params.set('buscar', filtros.buscar.trim());
    }
    if (filtros.stockBajo) {
      params = params.set('stockBajo', true);
    }
    return this.http.get<Pagina<Material>>(this.base, { params });
  }

  /** Cuántos materiales activos tienen stock bajo (para el aviso rápido). */
  contarStockBajo(): Observable<Pagina<Material>> {
    const params = new HttpParams().set('stockBajo', true).set('size', 1);
    return this.http.get<Pagina<Material>>(this.base, { params });
  }

  obtener(id: string): Observable<Material> {
    return this.http.get<Material>(`${this.base}/${id}`);
  }

  crear(req: CrearMaterialRequest): Observable<Material> {
    return this.http.post<Material>(this.base, req);
  }

  actualizar(id: string, version: number, req: ActualizarMaterialRequest): Observable<Material> {
    return this.http.put<Material>(`${this.base}/${id}`, req, {
      headers: new HttpHeaders({ 'If-Match': String(version) }),
    });
  }

  desactivar(id: string): Observable<Material> {
    return this.http.patch<Material>(`${this.base}/${id}/desactivar`, null);
  }

  reactivar(id: string): Observable<Material> {
    return this.http.patch<Material>(`${this.base}/${id}/reactivar`, null);
  }

  /** `clave`: Idempotency-Key (se reusa al reintentar para no repetir el movimiento). */
  mover(id: string, req: RegistrarMovimientoRequest, clave: string): Observable<Material> {
    return this.http.post<Material>(`${this.base}/${id}/movimientos`, req, {
      headers: new HttpHeaders({ 'Idempotency-Key': clave }),
    });
  }

  historial(id: string, pagina: number, tamano: number): Observable<Pagina<MovimientoMaterial>> {
    const params = new HttpParams().set('page', pagina).set('size', tamano);
    return this.http.get<Pagina<MovimientoMaterial>>(`${this.base}/${id}/movimientos`, { params });
  }
}
