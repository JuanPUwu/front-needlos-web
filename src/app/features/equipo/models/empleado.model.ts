// Modelos del equipo (empleados), alineados con /api/v1/empleados del backend.

import { Permiso } from '../../../core/auth/permisos';

/** Roles que un SASTRE_ADMIN puede asignar (SUPER_ADMIN no es asignable). */
export type RolEmpleado = 'SASTRE' | 'SASTRE_ADMIN';

export interface Empleado {
  accesoId: string;
  cuentaId: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  numeroDocumento: string | null;
  roles: string[];
  /** Permisos otorgados (vacío para un admin, que los tiene todos). */
  permisos: Permiso[];
  activo: boolean;
}

/** Una invitación pendiente de aceptar (aún no es miembro). */
export interface Invitacion {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
  expira: string;
  creadoEn: string;
}

export interface CrearEmpleadoRequest {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  numeroDocumento: string | null;
  rol: RolEmpleado;
}

export interface ActualizarEmpleadoRequest {
  nombre: string;
  apellido: string;
  telefono: string | null;
  numeroDocumento: string | null;
  rol: RolEmpleado;
  permisos: Permiso[];
}

/** Miembro activo al que se le puede asignar una prenda. */
export interface MiembroAsignable {
  accesoId: string;
  nombre: string;
}
