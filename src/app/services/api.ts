import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

// Cliente HTTP base — equivalente a Services/ApiService.cs en el desktop.
// Toda llamada al backend pasa por aquí.
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  get<T>(endpoint: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(`${this.baseUrl}/${endpoint}`));
  }

  post<T>(endpoint: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(`${this.baseUrl}/${endpoint}`, body));
  }

  put<T>(endpoint: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.put<T>(`${this.baseUrl}/${endpoint}`, body));
  }

  delete<T>(endpoint: string): Promise<T> {
    return firstValueFrom(this.http.delete<T>(`${this.baseUrl}/${endpoint}`));
  }
}
