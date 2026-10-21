/** Importación (Manual §16.1; alineado con ImportacionDtos del backend). */

/** Tipo en la URL del backend. */
export type TipoImportacion = 'clientes' | 'tipos-de-prenda' | 'materiales';

export const TIPOS_IMPORTACION: { valor: TipoImportacion; etiqueta: string; plural: string }[] = [
  { valor: 'clientes', etiqueta: 'Clientes', plural: 'clientes' },
  { valor: 'tipos-de-prenda', etiqueta: 'Catálogo', plural: 'tipos de prenda' },
  { valor: 'materiales', etiqueta: 'Inventario', plural: 'materiales' },
];

/** Una columna de la plantilla: su nombre, si es obligatoria y qué poner. */
export interface ColumnaPlantilla {
  nombre: string;
  obligatoria: boolean;
  ayuda: string;
}

/** Qué debe llevar cada plantilla (se muestra en el popup para guiar al usuario). */
export const COLUMNAS: Record<TipoImportacion, ColumnaPlantilla[]> = {
  clientes: [
    { nombre: 'nombre', obligatoria: true, ayuda: 'Al menos 2 letras. Ej.: Ana' },
    { nombre: 'apellido', obligatoria: true, ayuda: 'Al menos 2 letras. Ej.: Ruiz' },
    {
      nombre: 'telefono',
      obligatoria: true,
      ayuda: 'De 7 a 15 dígitos, sin repetir (puede llevar espacios). Ej.: 300 123 4567',
    },
  ],
  'tipos-de-prenda': [
    { nombre: 'nombre', obligatoria: true, ayuda: 'Sin repetir. Ej.: Camisa' },
    { nombre: 'precio_base', obligatoria: false, ayuda: 'Número, sin "$" obligatorio. Ej.: 25000' },
    { nombre: 'activo', obligatoria: false, ayuda: 'sí o no (vacío = sí)' },
  ],
  materiales: [
    { nombre: 'nombre', obligatoria: true, ayuda: 'Sin repetir. Ej.: Tela azul' },
    {
      nombre: 'unidad',
      obligatoria: true,
      ayuda: 'metro, centímetro, yarda, unidad, carrete, rollo, caja o paquete',
    },
    { nombre: 'cantidad', obligatoria: false, ayuda: 'Lo que tienes hoy. Ej.: 12,5' },
    { nombre: 'stock_minimo', obligatoria: false, ayuda: 'Desde cuánto avisar. Ej.: 5' },
    { nombre: 'activo', obligatoria: false, ayuda: 'sí o no (vacío = sí)' },
  ],
};

export type EstadoFila = 'NUEVO' | 'OMITIDO' | 'ERROR';

export interface FilaImportacion {
  linea: number;
  resumen: string;
  estado: EstadoFila;
  motivo: string | null;
}

export interface VistaPrevia {
  filas: FilaImportacion[];
  nuevos: number;
  omitidos: number;
  errores: number;
}

export interface ResultadoImportacion {
  importados: number;
  omitidos: number;
}
