/** Unidades de medida (lista fija, alineada con el enum UnidadMedida del backend). */
export type UnidadMedida =
  'METRO' | 'CENTIMETRO' | 'YARDA' | 'UNIDAD' | 'CARRETE' | 'ROLLO' | 'CAJA' | 'PAQUETE';

export const UNIDADES: { valor: UnidadMedida; singular: string; plural: string }[] = [
  { valor: 'METRO', singular: 'metro', plural: 'metros' },
  { valor: 'CENTIMETRO', singular: 'centímetro', plural: 'centímetros' },
  { valor: 'YARDA', singular: 'yarda', plural: 'yardas' },
  { valor: 'UNIDAD', singular: 'unidad', plural: 'unidades' },
  { valor: 'CARRETE', singular: 'carrete', plural: 'carretes' },
  { valor: 'ROLLO', singular: 'rollo', plural: 'rollos' },
  { valor: 'CAJA', singular: 'caja', plural: 'cajas' },
  { valor: 'PAQUETE', singular: 'paquete', plural: 'paquetes' },
];

/** "metro" o "metros" según la cantidad (1 en singular; 0, decimales y más, en plural). */
export function etiquetaUnidad(unidad: UnidadMedida, cantidad = 2): string {
  const u = UNIDADES.find((x) => x.valor === unidad);
  if (!u) {
    return unidad;
  }
  return cantidad === 1 ? u.singular : u.plural;
}

/** Material del inventario. `version` va en If-Match al editar. */
export interface Material {
  id: string;
  nombre: string;
  unidad: UnidadMedida;
  cantidad: number;
  stockMinimo: number;
  /** Cantidad en el stock mínimo o por debajo. */
  stockBajo: boolean;
  activo: boolean;
  version: number;
}

/** Estado que se muestra en el listado. */
export type EstadoStock = 'DISPONIBLE' | 'BAJO' | 'AGOTADO' | 'DESACTIVADO';

export const ETIQUETA_ESTADO_STOCK: Record<EstadoStock, string> = {
  DISPONIBLE: 'Disponible',
  BAJO: 'Stock bajo',
  AGOTADO: 'Agotado',
  DESACTIVADO: 'Desactivado',
};

export function estadoStock(m: Material): EstadoStock {
  if (!m.activo) {
    return 'DESACTIVADO';
  }
  if (m.cantidad <= 0) {
    return 'AGOTADO';
  }
  return m.stockBajo ? 'BAJO' : 'DISPONIBLE';
}

export interface CrearMaterialRequest {
  nombre: string;
  unidad: UnidadMedida;
  stockMinimo: number;
  cantidadInicial: number | null;
}

export interface ActualizarMaterialRequest {
  nombre: string;
  unidad: UnidadMedida;
  stockMinimo: number;
}

export type TipoMovimientoMaterial = 'ENTRADA' | 'SALIDA';

export interface RegistrarMovimientoRequest {
  tipo: TipoMovimientoMaterial;
  cantidad: number;
  razon: string;
}

/** Un renglón del historial del material. */
export interface MovimientoMaterial {
  id: string;
  tipo: TipoMovimientoMaterial;
  cantidad: number;
  razon: string;
  /** Cantidad del material justo después del movimiento. */
  cantidadResultante: number;
  /** ISO */
  registrado: string;
  registradoPor: string | null;
}

export type EstadoMaterial = 'ACTIVOS' | 'INACTIVOS' | 'TODOS';

export const ESTADOS_MATERIAL: { valor: EstadoMaterial; etiqueta: string }[] = [
  { valor: 'ACTIVOS', etiqueta: 'Activos' },
  { valor: 'INACTIVOS', etiqueta: 'Desactivados' },
  { valor: 'TODOS', etiqueta: 'Todos' },
];

export type OrdenMateriales =
  'nombre,asc' | 'nombre,desc' | 'cantidad,asc' | 'cantidad,desc' | 'actualizadoEn,desc';

export const ORDENES_MATERIALES: { valor: OrdenMateriales; etiqueta: string }[] = [
  { valor: 'nombre,asc', etiqueta: 'Nombre (A–Z)' },
  { valor: 'nombre,desc', etiqueta: 'Nombre (Z–A)' },
  { valor: 'cantidad,asc', etiqueta: 'Menor cantidad' },
  { valor: 'cantidad,desc', etiqueta: 'Mayor cantidad' },
  { valor: 'actualizadoEn,desc', etiqueta: 'Últimos cambios' },
];

/** Filtros del listado (viven en la URL). */
export interface FiltrosMateriales {
  buscar: string;
  estado: EstadoMaterial;
  stockBajo: boolean;
  orden: OrdenMateriales;
}

export const FILTROS_MATERIALES_INICIALES: FiltrosMateriales = {
  buscar: '',
  estado: 'ACTIVOS',
  stockBajo: false,
  orden: 'nombre,asc',
};
