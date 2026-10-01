import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CambiarContrasenaRequest, SesionActiva } from '../models/cuenta.model';

@Injectable({ providedIn: 'root' })
export class CuentaService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  cambiarContrasena(req: CambiarContrasenaRequest): Observable<void> {
    return this.http.patch<void>(`${this.api}/api/v1/cuenta/contrasena`, req);
  }

  listarSesiones(): Observable<SesionActiva[]> {
    return this.http.get<SesionActiva[]>(`${this.api}/api/v1/auth/sesiones`);
  }

  cerrarSesion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/api/v1/auth/sesiones/${id}`);
  }

  cerrarOtrasSesiones(): Observable<void> {
    return this.http.delete<void>(`${this.api}/api/v1/auth/sesiones`);
  }
}
