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

/** Serie del gráfico: por HORA si el periodo es un día, por DIA si son varios. */
export type Agrupacion = 'HORA' | 'DIA';

/** Cómo se ven los informes (dueño 2026-10-20): tablas (por defecto) o gráficos. */
export type ModoInforme = 'tablas' | 'graficos';

/** `clave`: la hora ("08") o el día ("2026-10-20"). */
export interface PuntoVentas {
  clave: string;
  ventas: number;
  ingresos: number;
}

export interface PuntoProductividad {
  clave: string;
  finalizadas: number;
  entregadas: number;
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
  agrupacion: Agrupacion;
  serie: PuntoVentas[];
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
  agrupacion: Agrupacion;
  serie: PuntoProductividad[];
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
