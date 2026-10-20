// Modelos de pedidos y abonos, alineados con /api/v1/pedidos del backend.

import { TicketDatos } from '../../../shared/ui/ticket/ticket';
import { GuardarClienteRequest } from '../../clientes/models/cliente.model';

export type EstadoPrenda = 'EN_PROCESO' | 'FINALIZADO' | 'ENTREGADO';
export type EstadoPedido = EstadoPrenda | 'ANULADO';
export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'NEQUI' | 'DAVIPLATA' | 'BRE_B' | 'OTRO';
export type MotivoAnulacionAbono = 'DEVOLUCION' | 'ERROR_REGISTRO';

export const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
  EN_PROCESO: 'En proceso',
  FINALIZADO: 'Listo para entregar',
  ENTREGADO: 'Entregado',
  ANULADO: 'Anulado',
};

export const ETIQUETA_ESTADO_PRENDA: Record<EstadoPrenda, string> = {
  EN_PROCESO: 'En proceso',
  FINALIZADO: 'Finalizada',
  ENTREGADO: 'Entregada',
};

export const METODOS_PAGO: { valor: MetodoPago; etiqueta: string }[] = [
  { valor: 'EFECTIVO', etiqueta: 'Efectivo' },
  { valor: 'TARJETA', etiqueta: 'Tarjeta' },
  { valor: 'NEQUI', etiqueta: 'Nequi' },
  { valor: 'DAVIPLATA', etiqueta: 'Daviplata' },
  { valor: 'BRE_B', etiqueta: 'Bre-B' },
  { valor: 'OTRO', etiqueta: 'Otro' },
];

export function etiquetaMetodo(metodo: MetodoPago): string {
  return METODOS_PAGO.find((m) => m.valor === metodo)?.etiqueta ?? metodo;
}

export interface ClienteDelPedido {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
}

/** Fila del listado. */
export interface PedidoResumen {
  id: string;
  /** "#G-L" */
  numero: string;
  cliente: ClienteDelPedido;
  /** yyyy-MM-dd */
  fecha: string;
  /** Momento en que se radicó (ISO). */
  radicado: string;
  fechaEntrega: string;
  estado: EstadoPedido;
  prendas: number;
  /** "2 × Camisa, Pantalón" */
  prendasResumen: string;
  total: number;
  saldo: number;
  vencido: boolean;
}

export interface Historial {
  estado: EstadoPrenda;
  /** ISO instante */
  fecha: string;
  usuario: string | null;
}

export interface Prenda {
  id: string;
  tipoPrendaId: string;
  tipoPrenda: string;
  sastreId: string | null;
  sastre: string | null;
  cantidad: number;
  descripcion: string;
  precioUnitario: number;
  subtotal: number;
  estado: EstadoPrenda;
  historial: Historial[];
}

export interface Abono {
  id: string;
  monto: number;
  metodo: MetodoPago;
  fecha: string;
  registradoPor: string | null;
  anulado: boolean;
  motivoAnulacion: MotivoAnulacionAbono | null;
  razonAnulacion: string | null;
  anuladoEn: string | null;
  anuladoPor: string | null;
}

/** Detalle completo. `version` va en If-Match al editar. */
export interface Pedido {
  id: string;
  numero: string;
  numeroGlobal: number;
  numeroLocal: number;
  cliente: ClienteDelPedido;
  fecha: string;
  fechaEntrega: string;
  estado: EstadoPedido;
  subtotal: number;
  descuento: number;
  total: number;
  abonado: number;
  saldo: number;
  pagado: boolean;
  vencido: boolean;
  razonAnulacion: string | null;
  prendas: Prenda[];
  abonos: Abono[];
  version: number;
}

export interface ResumenPedidos {
  enProceso: number;
  listosParaEntregar: number;
  vencidos: number;
  paraEntregarHoy: number;
}

// ── Peticiones ──────────────────────────────────────────────────

export interface PrendaRequest {
  /** Solo al editar, para una prenda existente. */
  id?: string | null;
  tipoPrendaId: string;
  sastreId: string | null;
  cantidad: number;
  descripcion: string;
  precioUnitario: number;
}

export interface AbonoRequest {
  monto: number;
  metodo: MetodoPago;
}

/** Exactamente uno: `clienteId` (existente) o `clienteNuevo`. */
export interface CrearPedidoRequest {
  clienteId: string | null;
  clienteNuevo: GuardarClienteRequest | null;
  fechaEntrega: string;
  descuento: number | null;
  prendas: PrendaRequest[];
  abonoInicial: AbonoRequest | null;
}

export interface ActualizarPedidoRequest {
  fechaEntrega: string;
  descuento: number | null;
  prendas: PrendaRequest[];
}

/** Filtros del listado ('' / false = sin filtro). */
export interface FiltrosPedidos {
  buscar: string;
  estado: EstadoPedido | '';
  clienteId: string;
  sastreId: string;
  entregaDesde: string;
  entregaHasta: string;
  vencidos: boolean;
  conSaldo: boolean;
  /** Con alguna prenda sin entregar (no anulados). */
  sinEntregar: boolean;
  orden: OrdenPedidos;
}

export type OrdenPedidos = 'fechaEntrega,asc' | 'fechaEntrega,desc' | 'numero,desc' | 'numero,asc';

export const FILTROS_PEDIDOS_INICIALES: FiltrosPedidos = {
  buscar: '',
  estado: '',
  clienteId: '',
  sastreId: '',
  entregaDesde: '',
  entregaHasta: '',
  vencidos: false,
  conSaldo: false,
  sinEntregar: false,
  orden: 'numero,desc',
};

// ── Ticket ──────────────────────────────────────────────────────

/** Datos del ticket (el componente de presentación vive en shared/ui/ticket). */
export type Ticket = TicketDatos;
