// Modelos de autenticacion, alineados con los DTOs del backend.

export interface LoginRequest {
  slug: string;
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiraEnSegundos: number;
}
