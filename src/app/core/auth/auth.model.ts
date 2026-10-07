// Modelos de autenticacion, alineados con los DTOs del backend (/api/v1/auth).

export type Rol = 'SASTRE' | 'SASTRE_ADMIN' | 'SUPER_ADMIN';

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Registro de una sastreria nueva (plan DEMO) con su cuenta dueno.
 * Solo se pide el nombre de la sastreria: el identificador lo genera el backend.
 */
export interface RegistrarSastreriaRequest {
  nombreSastreria: string;
  nombreAdmin: string;
  apellidoAdmin: string;
  numeroDocumento: string;
  email: string;
  password: string;
  telefono: string | null;
}

/** Registro de una sastreria con la cuenta de Google del dueno. */
export interface RegistrarSastreriaGoogleRequest {
  idToken: string;
  nombreSastreria: string;
}

/**
 * Respuesta del registro con correo y contrasena: la cuenta y la sastreria ya
 * existen, pero falta confirmar el codigo que se envio a este correo (Google
 * ya verifica el correo solo, por eso no pasa por aqui).
 */
export interface RegistroPendienteResponse {
  email: string;
  /** Mensaje para el usuario (p. ej. el correo ya tenia un registro pendiente y se conservo su sastreria). */
  aviso: string | null;
}

export interface VerificarCorreoRequest {
  email: string;
  codigo: string;
}

/** Una sastreria a la que la cuenta puede entrar. */
export interface SastreriaResumen {
  tenantId: string;
  nombre: string;
  slug: string;
  roles: Rol[];
}

export interface CuentaResumen {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
}

/**
 * Sesion iniciada. El access token vive SOLO en memoria; el refresh token
 * viaja en una cookie HttpOnly que el codigo no puede leer.
 * `sastreria` es null para el SUPER_ADMIN.
 */
export interface SesionResponse {
  accessToken: string;
  expiraEnSegundos: number;
  roles: Rol[];
  cuenta: CuentaResumen;
  sastreria: SastreriaResumen | null;
}

/**
 * Respuesta del login:
 *  · requiereSeleccion=false -> viene `sesion`.
 *  · requiereSeleccion=true  -> vienen `preauthToken` + `sastrerias`.
 */
export interface LoginResponse {
  requiereSeleccion: boolean;
  preauthToken: string | null;
  sastrerias: SastreriaResumen[] | null;
  sesion: SesionResponse | null;
}

/** Estado transitorio mientras la cuenta elige entre varias sastrerias. */
export interface SeleccionPendiente {
  preauthToken: string;
  sastrerias: SastreriaResumen[];
}
