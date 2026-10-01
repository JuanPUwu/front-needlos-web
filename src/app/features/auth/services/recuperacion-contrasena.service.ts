import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Recuperacion de contrasena por correo (endpoints publicos, sin sesion). */
@Injectable({ providedIn: 'root' })
export class RecuperacionContrasenaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/auth`;

  /** El backend responde igual exista o no el correo. */
  solicitar(email: string): Observable<void> {
    return this.http.post<void>(`${this.base}/recuperar-contrasena`, { email });
  }

  restablecer(token: string, contrasenaNueva: string): Observable<void> {
    return this.http.post<void>(`${this.base}/restablecer-contrasena`, { token, contrasenaNueva });
  }
}
