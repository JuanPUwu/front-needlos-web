import { NotificacionBandeja } from '../../../core/notificaciones/bandeja';

export type TipoNotificacionBandeja = NotificacionBandeja['tipo'];

/** Cómo se nombra cada tipo en el historial. */
export const TIPOS_NOTIFICACION: { valor: TipoNotificacionBandeja; etiqueta: string }[] = [
  { valor: 'PROPIA', etiqueta: 'Lo que hiciste' },
  { valor: 'PEDIDO', etiqueta: 'Pedidos' },
  { valor: 'VENCIMIENTO', etiqueta: 'Vencimiento del plan' },
  { valor: 'LICENCIA', etiqueta: 'Licencia' },
  { valor: 'SOPORTE', etiqueta: 'Soporte' },
  { valor: 'EXPORTACION', etiqueta: 'Exportación' },
  { valor: 'ELIMINACION', etiqueta: 'Eliminación' },
];

export const ETIQUETA_TIPO = Object.fromEntries(
  TIPOS_NOTIFICACION.map((t) => [t.valor, t.etiqueta]),
) as Record<TipoNotificacionBandeja, string>;

/** Filtros del historial (viven en la URL). `estado`: '' (todas), 'sin-leer' o 'leidas'. */
export interface FiltrosHistorial {
  buscar: string;
  tipo: string;
  estado: string;
  /** yyyy-MM-dd */
  desde: string;
  hasta: string;
}

export const FILTROS_HISTORIAL_INICIALES: FiltrosHistorial = {
  buscar: '',
  tipo: '',
  estado: '',
  desde: '',
  hasta: '',
};
