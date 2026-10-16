// Modelos de clientes, alineados con /api/v1/clientes del backend.

export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  /** yyyy-MM-dd */
  fechaRegistro: string;
  /** Lo que debe sumando sus pedidos no anulados (0 si está al día). */
  saldoPendiente: number;
  /** Se envía en If-Match al editar (bloqueo optimista). */
  version: number;
}

export interface GuardarClienteRequest {
  nombre: string;
  apellido: string;
  telefono: string;
}

/** Orden del listado (campo,dirección del backend). */
export type OrdenClientes =
  'nombre,asc' | 'apellido,asc' | 'fechaRegistro,desc' | 'fechaRegistro,asc';

/** Filtros del listado: todos opcionales ('' = sin filtro). Fechas yyyy-MM-dd. */
export interface FiltrosClientes {
  buscar: string;
  desde: string;
  hasta: string;
  orden: OrdenClientes;
}

export const FILTROS_CLIENTES_INICIALES: FiltrosClientes = {
  buscar: '',
  desde: '',
  hasta: '',
  orden: 'nombre,asc',
};
