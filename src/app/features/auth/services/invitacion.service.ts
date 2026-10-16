import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Datos de una invitación para la pantalla de aceptar (endpoint público). */
export interface InvitacionInfo {
  sastreria: string;
  email: string;
  nombre: string;
  /** true si la persona debe definir una contraseña al aceptar (cuenta nueva). */
  requiereContrasena: boolean;
}

@Injectable({ providedIn: 'root' })
export class InvitacionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/invitaciones`;

  info(token: string): Observable<InvitacionInfo> {
    return this.http.get<InvitacionInfo>(`${this.base}/${token}`);
  }

  aceptar(token: string, contrasena: string | null): Observable<void> {
    return this.http.post<void>(`${this.base}/${token}/aceptar`, { contrasena });
  }
}
