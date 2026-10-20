/**
 * Acceso seguro a localStorage / sessionStorage (Reglas §12.1, "recordar lo que hacía el
 * usuario"). Todas las claves de la app empiezan por `needlos:`. Si el navegador bloquea el
 * almacenamiento (modo privado, cuota llena), simplemente no se recuerda nada.
 */
export const PREFIJO = 'needlos:';

export function leerAlmacen(almacen: Storage, clave: string): string | null {
  try {
    return almacen.getItem(PREFIJO + clave);
  } catch {
    return null;
  }
}

export function escribirAlmacen(almacen: Storage, clave: string, valor: string | null): void {
  try {
    if (valor === null) {
      almacen.removeItem(PREFIJO + clave);
    } else {
      almacen.setItem(PREFIJO + clave, valor);
    }
  } catch {
    // Sin almacenamiento disponible: se ignora.
  }
}

/**
 * Borra todo lo recordado. Se llama al cerrar sesión: en una sastrería varias personas usan
 * el mismo computador.
 */
export function borrarTodoLoRecordado(): void {
  for (const almacen of [localStorage, sessionStorage]) {
    try {
      Object.keys(almacen)
        .filter((k) => k.startsWith(PREFIJO))
        .forEach((k) => almacen.removeItem(k));
    } catch {
      // Sin almacenamiento disponible.
    }
  }
}

/** URL a la que volver después de iniciar sesión (sessionStorage: se pierde al cerrar la pestaña). */
export function guardarRutaDeRegreso(url: string | null): void {
  escribirAlmacen(sessionStorage, 'regreso', url);
}

export function tomarRutaDeRegreso(): string | null {
  const url = leerAlmacen(sessionStorage, 'regreso');
  escribirAlmacen(sessionStorage, 'regreso', null);
  return url;
}
