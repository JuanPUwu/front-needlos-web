/** Contenido de una página pública: secciones con párrafos, listas y enlaces (Manual §16.1, H). */

export interface EnlacePublico {
  /** Qué es ("Correo"). */
  etiqueta: string;
  /** Lo que se ve ("pablys8@gmail.com"). */
  texto: string;
  url: string;
}

export interface SeccionPublica {
  titulo: string;
  parrafos?: string[];
  lista?: string[];
  enlaces?: EnlacePublico[];
}

/** Datos del responsable de NeedlOS (dueño 2026-10-20). */
export const RESPONSABLE = {
  nombre: 'Pablo Rivas Alfonso',
  correo: 'pablys8@gmail.com',
  telefono: '+57 313 358 5900',
  telefonoUrl: '+573133585900',
  whatsappUrl: 'https://wa.me/573133585900',
  /** Fecha de los textos legales. */
  actualizado: '20 de octubre de 2026',
} as const;
