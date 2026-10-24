/** Panel del SuperAdmin (alineado con PlataformaDtos del backend). Solo datos de uso. */

/**
 * Estado de una sastrería (Manual §16.1): "sin plan" sigue entrando (solo lectura); el único
 * bloqueo es por abuso; "en eliminación" = nadie entra y se borra a los 90 días.
 */
export type EstadoPlataforma =
  | 'ELIMINADA'
  | 'EN_ELIMINACION'
  | 'BLOQUEADA'
  | 'SIN_PLAN'
  | 'POR_VENCER'
  | 'LICENCIADA'
  | 'PRUEBA';

export const ETIQUETA_ESTADO_PLATAFORMA: Record<EstadoPlataforma, string> = {
  PRUEBA: 'En prueba',
  LICENCIADA: 'Licenciada',
  POR_VENCER: 'Por vencer',
  SIN_PLAN: 'Sin plan',
  BLOQUEADA: 'Bloqueada',
  EN_ELIMINACION: 'En eliminación',
  ELIMINADA: 'Eliminada',
};

export const ESTADOS_PLATAFORMA: { valor: EstadoPlataforma | ''; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todas' },
  { valor: 'PRUEBA', etiqueta: 'En prueba' },
  { valor: 'LICENCIADA', etiqueta: 'Licenciadas' },
  { valor: 'POR_VENCER', etiqueta: 'Por vencer' },
  { valor: 'SIN_PLAN', etiqueta: 'Sin plan' },
  { valor: 'BLOQUEADA', etiqueta: 'Bloqueadas' },
  { valor: 'EN_ELIMINACION', etiqueta: 'En eliminación' },
  { valor: 'ELIMINADA', etiqueta: 'Eliminadas' },
];

export type AccionSuperAdmin =
  | 'LICENCIA_OTORGADA'
  | 'SASTRERIA_DESACTIVADA'
  | 'SASTRERIA_ACTIVADA'
  | 'SOPORTE_INICIADO'
  | 'SUPERADMIN_INVITADO'
  | 'SUPERADMIN_ELIMINADO'
  | 'CONFIGURACION_CAMBIADA'
  | 'SASTRERIA_BLOQUEADA'
  | 'SASTRERIA_DESBLOQUEADA'
  | 'ELIMINACION_CANCELADA'
  | 'DUENO_CAMBIADO';

export const ETIQUETA_ACCION_SUPERADMIN: Record<AccionSuperAdmin, string> = {
  LICENCIA_OTORGADA: 'Licencia',
  SASTRERIA_DESACTIVADA: 'Desactivada',
  SASTRERIA_ACTIVADA: 'Activada',
  SOPORTE_INICIADO: 'Soporte',
  SUPERADMIN_INVITADO: 'SuperAdmin invitado',
  SUPERADMIN_ELIMINADO: 'SuperAdmin eliminado',
  CONFIGURACION_CAMBIADA: 'Configuración',
  SASTRERIA_BLOQUEADA: 'Bloqueada',
  SASTRERIA_DESBLOQUEADA: 'Desbloqueada',
  ELIMINACION_CANCELADA: 'Recuperada',
  DUENO_CAMBIADO: 'Dueño cambiado',
};

/** Un administrador activo de la sastrería (para elegir el dueño). */
export interface AdminSastreria {
  cuentaId: string;
  nombre: string;
  email: string;
  dueno: boolean;
}

/** Tipos de acción para el filtro del Registro. */
export const ACCIONES_SUPERADMIN: { valor: AccionSuperAdmin | ''; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todas las acciones' },
  { valor: 'LICENCIA_OTORGADA', etiqueta: 'Licencias' },
  { valor: 'SASTRERIA_BLOQUEADA', etiqueta: 'Bloqueos' },
  { valor: 'SASTRERIA_DESBLOQUEADA', etiqueta: 'Desbloqueos' },
  { valor: 'ELIMINACION_CANCELADA', etiqueta: 'Recuperadas' },
  { valor: 'DUENO_CAMBIADO', etiqueta: 'Cambios de dueño' },
  { valor: 'SOPORTE_INICIADO', etiqueta: 'Soporte' },
  { valor: 'SUPERADMIN_INVITADO', etiqueta: 'SuperAdmins invitados' },
  { valor: 'SUPERADMIN_ELIMINADO', etiqueta: 'SuperAdmins eliminados' },
  { valor: 'CONFIGURACION_CAMBIADA', etiqueta: 'Configuración' },
];

export interface ResumenPlataforma {
  total: number;
  activas: number;
  enPrueba: number;
  licenciadas: number;
  porVencer: number;
  sinPlan: number;
  bloqueadas: number;
  enEliminacion: number;
}

export interface SastreriaPlataforma {
  id: string;
  nombre: string;
  plan: 'DEMO' | 'LICENCIADO';
  /** ISO; null si no vence. */
  vence: string | null;
  estado: EstadoPlataforma;
  activo: boolean;
  registro: string;
  ultimoAcceso: string | null;
  pedidos: number;
  personas: number;
  admin: string | null;
  adminEmail: string | null;
  telefono: string | null;
  /** Motivo del bloqueo por abuso (null si no está bloqueada). */
  bloqueoMotivo: string | null;
  eliminacionSolicitadaEn: string | null;
  /** Cuándo se borra (90 días después de pedirlo). */
  seBorraEl: string | null;
  eliminacionOrigen: 'DUENO' | 'ABANDONO' | null;
  eliminadaEn: string | null;
}

export interface AccionPlataforma {
  id: string;
  accion: AccionSuperAdmin;
  sastreriaId: string | null;
  sastreria: string | null;
  detalle: string;
  superAdmin: string;
  fecha: string;
}

/** Licencia por meses (dueño 2026-10-20). */
export const MESES_LICENCIA = [1, 3, 6, 12] as const;

export type OrdenSastrerias =
  'registro,desc' | 'nombre,asc' | 'vence,asc' | 'ultimoAcceso,desc' | 'pedidos,desc';

export const ORDENES_SASTRERIAS: { valor: OrdenSastrerias; etiqueta: string }[] = [
  { valor: 'registro,desc', etiqueta: 'Más recientes' },
  { valor: 'nombre,asc', etiqueta: 'Nombre (A–Z)' },
  { valor: 'vence,asc', etiqueta: 'Vencen primero' },
  { valor: 'ultimoAcceso,desc', etiqueta: 'Último acceso' },
  { valor: 'pedidos,desc', etiqueta: 'Más pedidos' },
];

/** Filtros del listado (viven en la URL). */
export interface FiltrosSastrerias {
  buscar: string;
  estado: EstadoPlataforma | '';
  orden: OrdenSastrerias;
}

export const FILTROS_SASTRERIAS_INICIALES: FiltrosSastrerias = {
  buscar: '',
  estado: '',
  orden: 'registro,desc',
};

// ── SuperAdmins (alineado con SuperAdminDtos) ───────────────────────

export interface SuperAdmin {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  /** El SuperAdmin principal: el único que invita y elimina; nunca se elimina. */
  principal: boolean;
}

export interface InvitacionSuperAdmin {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  expira: string;
}

export interface SuperAdmins {
  /** Si quien consulta es el principal (puede invitar y eliminar). */
  soyPrincipal: boolean;
  superAdmins: SuperAdmin[];
  /** Solo llegan al principal. */
  invitaciones: InvitacionSuperAdmin[];
}

export interface InvitarSuperAdmin {
  email: string;
  nombre: string;
  apellido: string;
}

// ── Registro de acciones (filtros en la URL) ────────────────────────

export interface FiltrosRegistro {
  buscar: string;
  accion: AccionSuperAdmin | '';
  /** yyyy-MM-dd (hora de Colombia) o ''. */
  desde: string;
  hasta: string;
}

export const FILTROS_REGISTRO_INICIALES: FiltrosRegistro = {
  buscar: '',
  accion: '',
  desde: '',
  hasta: '',
};

// ── Dueños de sastrerías ────────────────────────────────────────────

export interface Dueno {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  verificada: boolean;
  registro: string;
  ultimoAcceso: string | null;
  sastrerias: string[];
}

export type OrdenDuenos = 'registro,desc' | 'nombre,asc' | 'ultimoAcceso,desc';

export const ORDENES_DUENOS: { valor: OrdenDuenos; etiqueta: string }[] = [
  { valor: 'registro,desc', etiqueta: 'Más recientes' },
  { valor: 'nombre,asc', etiqueta: 'Nombre (A–Z)' },
  { valor: 'ultimoAcceso,desc', etiqueta: 'Último acceso' },
];

export type EstadoCorreoDueno = 'VERIFICADO' | 'SIN_VERIFICAR';

export const ESTADOS_CORREO_DUENO: { valor: EstadoCorreoDueno | ''; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todos los correos' },
  { valor: 'VERIFICADO', etiqueta: 'Correo verificado' },
  { valor: 'SIN_VERIFICAR', etiqueta: 'Sin verificar' },
];

export interface FiltrosDuenos {
  buscar: string;
  correo: EstadoCorreoDueno | '';
  orden: OrdenDuenos;
}

export const FILTROS_DUENOS_INICIALES: FiltrosDuenos = {
  buscar: '',
  correo: '',
  orden: 'registro,desc',
};

// ── Configuración del sistema ───────────────────────────────────────

export interface ConfiguracionSistema {
  diasPrueba: number;
  diasAviso: number;
  /** Solo el SuperAdmin principal la cambia. */
  puedeEditar: boolean;
  actualizadoEn: string;
  actualizadoPor: string | null;
}
