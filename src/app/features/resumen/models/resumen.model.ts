import { MetodoPago } from '../../pedidos/models/pedido.model';

/** Resumen (informativo): neto = ingresos − devoluciones − egresos. */
export interface Totales {
  ingresos: number;
  devoluciones: number;
  egresos: number;
  neto: number;
}

export interface TotalesMetodo extends Totales {
  metodo: MetodoPago;
}

export interface Transferencias extends Totales {
  porMetodo: TotalesMetodo[];
}

export interface DiaResumen extends Totales {
  /** yyyy-MM-dd */
  fecha: string;
}

export type TipoMovimiento = 'ABONO' | 'DEVOLUCION' | 'GASTO';

export const ETIQUETA_MOVIMIENTO: Record<TipoMovimiento, string> = {
  ABONO: 'Abono',
  DEVOLUCION: 'Devolución',
  GASTO: 'Gasto',
};

export interface Movimiento {
  tipo: TipoMovimiento;
  id: string;
  fecha: string;
  momento: string | null;
  metodo: MetodoPago;
  monto: number;
  razon: string | null;
  pedidoId: string | null;
  pedidoNumero: string | null;
  cliente: string | null;
}

export type EstadoDia = 'EN_CURSO' | 'CERRADO';

export interface Resumen {
  desde: string;
  hasta: string;
  /** "HH:mm" */
  horaInicio: string;
  horaFin: string;
  /** Solo para un día (null en periodos o días futuros). */
  estado: EstadoDia | null;
  total: Totales;
  efectivo: Totales;
  transferencias: Transferencias;
  dias: DiaResumen[];
}

/** Orden de los movimientos (lista blanca del backend: solo `momento`). */
export type OrdenMovimientos = 'momento,desc' | 'momento,asc';

export const ORDENES_MOVIMIENTOS: { valor: OrdenMovimientos; etiqueta: string }[] = [
  { valor: 'momento,desc', etiqueta: 'Recientes' },
  { valor: 'momento,asc', etiqueta: 'Antiguos' },
];

/** Filtros de los movimientos (en la URL; vacío = todos). */
export interface FiltrosMovimientos {
  tipo: TipoMovimiento | '';
  metodo: string;
  orden: OrdenMovimientos;
}

export const FILTROS_MOVIMIENTOS_INICIALES: FiltrosMovimientos = {
  tipo: '',
  metodo: '',
  orden: 'momento,desc',
};

/** Periodos rápidos del selector (por defecto, Hoy). */
export type Periodo = 'hoy' | 'semana' | 'semana-pasada' | 'mes' | 'rango';

export const PERIODOS: { valor: Periodo; etiqueta: string }[] = [
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: 'semana', etiqueta: 'Esta semana' },
  { valor: 'semana-pasada', etiqueta: 'Semana pasada' },
  { valor: 'mes', etiqueta: 'Este mes' },
  { valor: 'rango', etiqueta: 'Rango' },
];
