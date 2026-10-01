import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

/** Error estandar de la API: RFC 9457 (ProblemDetail) + codigo propio (Reglas §6). */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status: number;
  detail: string;
  instance?: string;
  code: string;
  timestamp?: string;
  correlationId?: string;
  errores?: { campo: string; mensaje: string }[];
}

export function esProblemDetail(valor: unknown): valor is ProblemDetail {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    typeof (valor as ProblemDetail).code === 'string' &&
    typeof (valor as ProblemDetail).detail === 'string'
  );
}

/** Mensaje para mostrar al usuario: el del backend si existe; si no, uno generico. */
export function mensajeDeError(error: unknown, porDefecto: string): string {
  if (error instanceof TimeoutError) {
    return 'El servidor tardo demasiado en responder. Intentalo de nuevo.';
  }
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No hay conexion con el servidor. Revisa tu internet e intentalo de nuevo.';
    }
    if (esProblemDetail(error.error)) {
      return error.error.detail;
    }
  }
  return porDefecto;
}

/** Codigo de error de la API (para decidir comportamientos, nunca por el texto). */
export function codigoDeError(error: unknown): string | null {
  return error instanceof HttpErrorResponse && esProblemDetail(error.error)
    ? error.error.code
    : null;
}
