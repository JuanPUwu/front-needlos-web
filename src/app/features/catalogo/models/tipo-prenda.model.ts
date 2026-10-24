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

/** El precio sugerido sale solo del catálogo (dueño 2026-10-23). */
export type OrigenPrecio = 'PRECIO_BASE' | 'NINGUNO';

export interface PrecioSugerido {
  precio: number | null;
  origen: OrigenPrecio;
}
