import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ActualizarEmpleadoRequest,
  CrearEmpleadoRequest,
  Empleado,
  Invitacion,
  MiembroAsignable,
} from '../models/empleado.model';

@Injectable({ providedIn: 'root' })
export class EmpleadoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/empleados`;

  listar(): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(this.base);
  }

  /** Invita por correo: crea una invitación pendiente (no agrega al instante). */
  invitar(req: CrearEmpleadoRequest): Observable<Invitacion> {
    return this.http.post<Invitacion>(this.base, req);
  }

  /** Miembros activos para asignar prendas (disponible para todo el equipo). */
  asignables(): Observable<MiembroAsignable[]> {
    return this.http.get<MiembroAsignable[]>(`${this.base}/asignables`);
  }

  listarInvitaciones(): Observable<Invitacion[]> {
    return this.http.get<Invitacion[]>(`${this.base}/invitaciones`);
  }

  reenviarInvitacion(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/invitaciones/${id}/reenviar`, null);
  }

  cancelarInvitacion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/invitaciones/${id}`);
  }

  actualizar(accesoId: string, req: ActualizarEmpleadoRequest): Observable<Empleado> {
    return this.http.put<Empleado>(`${this.base}/${accesoId}`, req);
  }

  desactivar(accesoId: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${accesoId}/desactivar`, null);
  }

  reactivar(accesoId: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${accesoId}/reactivar`, null);
  }

  /** Quita a la persona del equipo (su historial se conserva; se le puede volver a invitar). */
  eliminar(accesoId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${accesoId}`);
  }
}
