import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ActualizarSastreriaRequest, Sastreria } from '../models/sastreria.model';

@Injectable({ providedIn: 'root' })
export class SastreriaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/sastreria`;

  obtener(): Observable<Sastreria> {
    return this.http.get<Sastreria>(this.base);
  }

  actualizar(req: ActualizarSastreriaRequest): Observable<Sastreria> {
    return this.http.patch<Sastreria>(this.base, req);
  }
}
