// Modelos de "Mi cuenta", alineados con /api/v1/cuenta y /api/v1/auth/sesiones.

/** Una sesion abierta de la cuenta (dispositivo). */
export interface SesionActiva {
  id: string;
  dispositivo: string;
  ip: string;
  creadaEn: string;
  ultimoUso: string;
  actual: boolean;
}

export interface CambiarContrasenaRequest {
  contrasenaActual: string;
  contrasenaNueva: string;
}
