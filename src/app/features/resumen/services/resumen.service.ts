import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Pagina } from '../../../core/http/pagina.model';
import { FiltrosMovimientos, Movimiento, Periodo, Resumen } from '../models/resumen.model';

/** Resumen de ingresos y egresos. Solo SASTRE_ADMIN. */
@Injectable({ providedIn: 'root' })
export class ResumenService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/resumen`;

  /** desde y hasta en yyyy-MM-dd (incluidos). */
  obtener(desde: string, hasta: string): Observable<Resumen> {
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);
    return this.http.get<Resumen>(this.base, { params });
  }

  /** Movimientos del periodo, paginados y filtrables por tipo y método. */
  movimientos(
    desde: string,
    hasta: string,
    filtros: FiltrosMovimientos,
    pagina: number,
    tamano: number,
  ): Observable<Pagina<Movimiento>> {
    let params = new HttpParams()
      .set('desde', desde)
      .set('hasta', hasta)
      .set('page', pagina)
      .set('size', tamano)
      .set('sort', filtros.orden);
    if (filtros.tipo) {
      params = params.set('tipo', filtros.tipo);
    }
    if (filtros.metodo) {
      params = params.set('metodo', filtros.metodo);
    }
    return this.http.get<Pagina<Movimiento>>(`${this.base}/movimientos`, { params });
  }
}

/** Días (yyyy-MM-dd) de `desde` a `hasta`, incluidos. */
export function diasEntre(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  const [a, m, d] = desde.split('-').map(Number);
  const actual = new Date(a, m - 1, d);
  for (let i = 0; i < 366 && iso(actual) <= hasta; i++) {
    dias.push(iso(actual));
    actual.setDate(actual.getDate() + 1);
  }
  return dias;
}

/** yyyy-MM-dd de una fecha local. */
function iso(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Fechas (yyyy-MM-dd) de un periodo rápido. Las semanas van de lunes a domingo; "Este mes"
 * va del día 1 a hoy. `hoy` se puede pasar para las pruebas.
 */
export function fechasDePeriodo(
  periodo: Exclude<Periodo, 'rango'>,
  hoy: Date = new Date(),
): { desde: string; hasta: string } {
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  // getDay(): 0 = domingo. Días desde el lunes de esta semana.
  const desdeLunes = (base.getDay() + 6) % 7;
  const lunes = new Date(base);
  lunes.setDate(base.getDate() - desdeLunes);
  switch (periodo) {
    case 'hoy':
      return { desde: iso(base), hasta: iso(base) };
    case 'semana': {
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      return { desde: iso(lunes), hasta: iso(domingo) };
    }
    case 'semana-pasada': {
      const lunesPasado = new Date(lunes);
      lunesPasado.setDate(lunes.getDate() - 7);
      const domingoPasado = new Date(lunes);
      domingoPasado.setDate(lunes.getDate() - 1);
      return { desde: iso(lunesPasado), hasta: iso(domingoPasado) };
    }
    case 'mes':
      return { desde: iso(new Date(base.getFullYear(), base.getMonth(), 1)), hasta: iso(base) };
  }
}
