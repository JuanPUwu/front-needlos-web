import { MetodoPago } from '../../pedidos/models/pedido.model';

/** Gasto (egreso) de la sastrería. `version` va en If-Match al corregir. */
export interface Gasto {
  id: string;
  razon: string;
  monto: number;
  metodo: MetodoPago;
  /** yyyy-MM-dd */
  fecha: string;
  /** Cuándo se registró (ISO). */
  registrado: string;
  registradoPor: string | null;
  version: number;
}

export interface GuardarGastoRequest {
  razon: string;
  monto: number;
  metodo: MetodoPago;
  fecha: string;
}

export type AccionGasto = 'CREADO' | 'CORREGIDO' | 'ELIMINADO';

export const ETIQUETA_ACCION: Record<AccionGasto, string> = {
  CREADO: 'Registrado',
  CORREGIDO: 'Corregido',
  ELIMINADO: 'Eliminado',
};

export interface ValoresGasto {
  razon: string;
  monto: number;
  metodo: MetodoPago;
  fecha: string;
}

/** Una entrada del historial de cambios de un gasto. */
export interface CambioGasto {
  accion: AccionGasto;
  fecha: string;
  usuario: string | null;
  antes: ValoresGasto | null;
  despues: ValoresGasto | null;
}

export type OrdenGastos = 'fecha,desc' | 'fecha,asc' | 'monto,desc' | 'monto,asc';

export const ORDENES_GASTOS: { valor: OrdenGastos; etiqueta: string }[] = [
  { valor: 'fecha,desc', etiqueta: 'Más recientes' },
  { valor: 'fecha,asc', etiqueta: 'Más antiguos' },
  { valor: 'monto,desc', etiqueta: 'Mayor monto' },
  { valor: 'monto,asc', etiqueta: 'Menor monto' },
];

/** Filtros del listado (viven en la URL). */
export interface FiltrosGastos {
  buscar: string;
  metodo: string;
  desde: string;
  hasta: string;
  orden: OrdenGastos;
}

export const FILTROS_GASTOS_INICIALES: FiltrosGastos = {
  buscar: '',
  metodo: '',
  desde: '',
  hasta: '',
  orden: 'fecha,desc',
};
