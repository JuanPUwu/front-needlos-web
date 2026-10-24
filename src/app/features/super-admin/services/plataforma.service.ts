import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Pagina } from '../../../core/http/pagina.model';
import { SesionResponse } from '../../../core/auth/auth.model';
import {
  AccionPlataforma,
  AdminSastreria,
  ConfiguracionSistema,
  Dueno,
  FiltrosDuenos,
  FiltrosRegistro,
  FiltrosSastrerias,
  InvitarSuperAdmin,
  ResumenPlataforma,
  SastreriaPlataforma,
  SuperAdmins,
} from '../models/plataforma.model';

/** Panel del SuperAdmin (Manual §16): consultas globales y acciones sobre sastrerías. */
@Injectable({ providedIn: 'root' })
export class PlataformaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/admin`;

  resumen(): Observable<ResumenPlataforma> {
    return this.http.get<ResumenPlataforma>(`${this.base}/resumen`);
  }

  sastrerias(
    filtros: FiltrosSastrerias,
    pagina: number,
    tamano: number,
  ): Observable<Pagina<SastreriaPlataforma>> {
    let params = new HttpParams()
      .set('page', pagina)
      .set('size', tamano)
      .set('sort', filtros.orden);
    if (filtros.buscar.trim()) {
      params = params.set('buscar', filtros.buscar.trim());
    }
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    return this.http.get<Pagina<SastreriaPlataforma>>(`${this.base}/sastrerias`, { params });
  }

  sastreria(id: string): Observable<SastreriaPlataforma> {
    return this.http.get<SastreriaPlataforma>(`${this.base}/sastrerias/${id}`);
  }

  otorgarLicencia(id: string, meses: number): Observable<SastreriaPlataforma> {
    return this.http.patch<SastreriaPlataforma>(`${this.base}/sastrerias/${id}/licencia`, {
      meses,
    });
  }

  /** Bloqueo por abuso (Manual §16.1): siempre con el motivo. */
  bloquear(id: string, motivo: string): Observable<SastreriaPlataforma> {
    return this.http.patch<SastreriaPlataforma>(`${this.base}/sastrerias/${id}/bloquear`, {
      motivo,
    });
  }

  desbloquear(id: string): Observable<SastreriaPlataforma> {
    return this.http.patch<SastreriaPlataforma>(`${this.base}/sastrerias/${id}/desbloquear`, null);
  }

  /** Recupera una sastrería en eliminación (dentro de los 90 días). */
  recuperar(id: string): Observable<SastreriaPlataforma> {
    return this.http.patch<SastreriaPlataforma>(`${this.base}/sastrerias/${id}/recuperar`, null);
  }

  /** Administradores activos de la sastrería (el dueño primero). */
  administradores(id: string): Observable<AdminSastreria[]> {
    return this.http.get<AdminSastreria[]>(`${this.base}/sastrerias/${id}/administradores`);
  }

  /** Cambia el dueño (solo por petición al soporte): debe ser un admin activo de la sastrería. */
  cambiarDueno(id: string, cuentaId: string): Observable<SastreriaPlataforma> {
    return this.http.put<SastreriaPlataforma>(`${this.base}/sastrerias/${id}/dueno`, { cuentaId });
  }

  /** Abre una sesión de soporte (solo lectura) dentro de la sastrería. */
  entrarEnSoporte(id: string): Observable<SesionResponse> {
    return this.http.post<SesionResponse>(`${this.base}/sastrerias/${id}/soporte`, null);
  }

  // ── SuperAdmins (invitar, cancelar y eliminar: solo el principal) ──

  superAdmins(): Observable<SuperAdmins> {
    return this.http.get<SuperAdmins>(`${this.base}/superadmins`);
  }

  invitarSuperAdmin(datos: InvitarSuperAdmin): Observable<void> {
    return this.http.post<void>(`${this.base}/superadmins/invitaciones`, datos);
  }

  cancelarInvitacion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/superadmins/invitaciones/${id}`);
  }

  eliminarSuperAdmin(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/superadmins/${id}`);
  }

  /** Registro de acciones; con `sastreria`, solo las de esa sastrería. */
  acciones(
    pagina: number,
    tamano: number,
    sastreria?: string,
    filtros?: FiltrosRegistro,
  ): Observable<Pagina<AccionPlataforma>> {
    let params = new HttpParams().set('page', pagina).set('size', tamano);
    if (sastreria) {
      params = params.set('sastreria', sastreria);
    }
    if (filtros) {
      for (const [clave, valor] of Object.entries(filtros)) {
        const texto = String(valor).trim();
        if (texto) {
          params = params.set(clave, texto);
        }
      }
    }
    return this.http.get<Pagina<AccionPlataforma>>(`${this.base}/acciones`, { params });
  }

  duenos(filtros: FiltrosDuenos, pagina: number, tamano: number): Observable<Pagina<Dueno>> {
    let params = new HttpParams()
      .set('page', pagina)
      .set('size', tamano)
      .set('sort', filtros.orden);
    if (filtros.buscar.trim()) {
      params = params.set('buscar', filtros.buscar.trim());
    }
    if (filtros.correo) {
      params = params.set('correo', filtros.correo);
    }
    return this.http.get<Pagina<Dueno>>(`${this.base}/duenos`, { params });
  }

  /** Si soy el SuperAdmin principal. */
  yo(): Observable<{ principal: boolean }> {
    return this.http.get<{ principal: boolean }>(`${this.base}/yo`);
  }

  configuracion(): Observable<ConfiguracionSistema> {
    return this.http.get<ConfiguracionSistema>(`${this.base}/configuracion`);
  }

  guardarConfiguracion(diasPrueba: number, diasAviso: number): Observable<ConfiguracionSistema> {
    return this.http.put<ConfiguracionSistema>(`${this.base}/configuracion`, {
      diasPrueba,
      diasAviso,
    });
  }
}
