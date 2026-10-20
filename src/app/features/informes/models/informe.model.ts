import { MetodoPago } from '../../pedidos/models/pedido.model';

/** Informes (alineados con InformeDtos del backend). Se cuentan piezas, no renglones. */

export interface IngresoMetodo {
  metodo: MetodoPago;
  ingresos: number;
  devoluciones: number;
  neto: number;
}

export interface VentaDia {
  /** yyyy-MM-dd */
  fecha: string;
  pedidos: number;
  ventas: number;
}

export interface Ventas {
  desde: string;
  hasta: string;
  pedidos: number;
  ventas: number;
  ticketPromedio: number;
  ingresos: number;
  porMetodo: IngresoMetodo[];
  porDia: VentaDia[];
}

export type CategoriaEntrega = 'VENCIDO' | 'HOY' | 'PROXIMO';

export const ETIQUETA_ENTREGA: Record<CategoriaEntrega, string> = {
  VENCIDO: 'Vencido',
  HOY: 'Hoy',
  PROXIMO: 'Próximo',
};

export interface PedidoConSaldo {
  id: string;
  numero: string;
  cliente: string;
  total: number;
  saldo: number;
  fechaEntrega: string;
}

export interface PedidoPorEntregar {
  id: string;
  numero: string;
  cliente: string;
  fechaEntrega: string;
  categoria: CategoriaEntrega;
  piezasPendientes: number;
}

/** Foto de hoy: no depende del periodo. */
export interface Cartera {
  hoy: string;
  totalAdeudado: number;
  pedidosConSaldo: number;
  mayoresSaldos: PedidoConSaldo[];
  vencidos: number;
  paraHoy: number;
  proximos: number;
  porEntregar: PedidoPorEntregar[];
}

/** `sastreId` y `nombre` son null para las prendas sin asignar. */
export interface ProductividadSastre {
  sastreId: string | null;
  nombre: string | null;
  finalizadas: number;
  entregadas: number;
}

export interface Productividad {
  desde: string;
  hasta: string;
  sastres: ProductividadSastre[];
}

export interface PrendaMasPedida {
  tipo: string;
  piezas: number;
  valor: number;
}

export interface ClienteFrecuente {
  clienteId: string;
  nombre: string;
  pedidos: number;
  valor: number;
}

export interface PrendasClientes {
  desde: string;
  hasta: string;
  prendas: PrendaMasPedida[];
  clientes: ClienteFrecuente[];
}
