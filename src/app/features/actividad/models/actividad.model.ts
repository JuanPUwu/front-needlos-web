export type CategoriaActividad =
  'PEDIDOS' | 'CLIENTES' | 'CATALOGO' | 'EQUIPO' | 'DATOS' | 'SASTRERIA';

export type AccionActividad =
  | 'PEDIDO_CREADO'
  | 'PEDIDO_EDITADO'
  | 'PEDIDO_ANULADO'
  | 'ABONO_REGISTRADO'
  | 'ABONO_ANULADO'
  | 'CLIENTE_CREADO'
  | 'CLIENTE_EDITADO'
  | 'CLIENTE_ELIMINADO'
  | 'PRENDA_CATALOGO_CREADA'
  | 'PRENDA_CATALOGO_EDITADA'
  | 'PRENDA_CATALOGO_DESACTIVADA'
  | 'PRENDA_CATALOGO_REACTIVADA'
  | 'PRENDA_CATALOGO_ELIMINADA'
  | 'EMPLEADO_EDITADO'
  | 'EMPLEADO_DESACTIVADO'
  | 'EMPLEADO_REACTIVADO'
  | 'EMPLEADO_ELIMINADO'
  | 'DUENO_CAMBIADO'
  | 'INVITACION_ENVIADA'
  | 'INVITACION_REENVIADA'
  | 'INVITACION_CANCELADA'
  | 'INVITACION_ACEPTADA'
  | 'INFORMACION_EXPORTADA'
  | 'INFORMACION_IMPORTADA'
  | 'SASTRERIA_EDITADA'
  | 'ELIMINACION_SOLICITADA'
  | 'ELIMINACION_POR_ABANDONO'
  | 'SASTRERIA_RECUPERADA';

/** Una entrada del registro de actividad (dueño 2026-10-22). */
export interface EntradaActividad {
  id: string;
  categoria: CategoriaActividad;
  accion: AccionActividad;
  /** Qué cambió, legible ("Pedido #12-5: descuento $ 0 → $ 5.000."). */
  resumen: string;
  cuentaId: string | null;
  /** Quién lo hizo; null = el sistema (p. ej. eliminación por abandono). */
  persona: string | null;
  fecha: string;
}

export const CATEGORIAS_ACTIVIDAD: { valor: CategoriaActividad; etiqueta: string }[] = [
  { valor: 'PEDIDOS', etiqueta: 'Pedidos y abonos' },
  { valor: 'CLIENTES', etiqueta: 'Clientes' },
  { valor: 'CATALOGO', etiqueta: 'Catálogo' },
  { valor: 'EQUIPO', etiqueta: 'Equipo' },
  { valor: 'DATOS', etiqueta: 'Exportar e importar' },
  { valor: 'SASTRERIA', etiqueta: 'Sastrería' },
];

export const ETIQUETA_ACCION: Record<AccionActividad, string> = {
  PEDIDO_CREADO: 'Pedido creado',
  PEDIDO_EDITADO: 'Pedido editado',
  PEDIDO_ANULADO: 'Pedido anulado',
  ABONO_REGISTRADO: 'Abono registrado',
  ABONO_ANULADO: 'Abono anulado',
  CLIENTE_CREADO: 'Cliente creado',
  CLIENTE_EDITADO: 'Cliente editado',
  CLIENTE_ELIMINADO: 'Cliente eliminado',
  PRENDA_CATALOGO_CREADA: 'Prenda agregada al catálogo',
  PRENDA_CATALOGO_EDITADA: 'Prenda del catálogo editada',
  PRENDA_CATALOGO_DESACTIVADA: 'Prenda desactivada',
  PRENDA_CATALOGO_REACTIVADA: 'Prenda reactivada',
  PRENDA_CATALOGO_ELIMINADA: 'Prenda eliminada del catálogo',
  EMPLEADO_EDITADO: 'Miembro editado',
  EMPLEADO_DESACTIVADO: 'Miembro desactivado',
  EMPLEADO_REACTIVADO: 'Miembro reactivado',
  EMPLEADO_ELIMINADO: 'Miembro quitado',
  DUENO_CAMBIADO: 'Dueño cambiado',
  INVITACION_ENVIADA: 'Invitación enviada',
  INVITACION_REENVIADA: 'Invitación reenviada',
  INVITACION_CANCELADA: 'Invitación cancelada',
  INVITACION_ACEPTADA: 'Invitación aceptada',
  INFORMACION_EXPORTADA: 'Información exportada',
  INFORMACION_IMPORTADA: 'Información importada',
  SASTRERIA_EDITADA: 'Datos de la sastrería',
  ELIMINACION_SOLICITADA: 'Eliminación pedida',
  ELIMINACION_POR_ABANDONO: 'Eliminación por abandono',
  SASTRERIA_RECUPERADA: 'Sastrería recuperada',
};

/** Filtros (viven en la URL). `persona`: id de la cuenta. Fechas yyyy-MM-dd. */
export interface FiltrosActividad {
  buscar: string;
  categoria: string;
  persona: string;
  desde: string;
  hasta: string;
}

export const FILTROS_ACTIVIDAD_INICIALES: FiltrosActividad = {
  buscar: '',
  categoria: '',
  persona: '',
  desde: '',
  hasta: '',
};
