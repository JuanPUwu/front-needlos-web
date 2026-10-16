// Modelos del catálogo de tipos de prenda, alineados con /api/v1/tipos-prenda.

export interface TipoPrenda {
  id: string;
  nombre: string;
  /** Opcional: solo se usa como sugerencia cuando aún no hay histórico. */
  precioBase: number | null;
  activo: boolean;
  /** Se envía en If-Match al editar (bloqueo optimista). */
  version: number;
}

export interface GuardarTipoPrendaRequest {
  nombre: string;
  precioBase: number | null;
}

export type OrigenPrecio = 'HISTORICO' | 'PRECIO_BASE' | 'NINGUNO';

export interface PrecioSugerido {
  precio: number | null;
  origen: OrigenPrecio;
}
