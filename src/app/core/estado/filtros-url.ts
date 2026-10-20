import { ParamMap, Params } from '@angular/router';

type Valor = string | number | boolean;

/**
 * Filtros en la URL (`?estado=FINALIZADO&pagina=2`): sobreviven a la recarga y el enlace se
 * puede compartir. Solo se escriben los que difieren del valor inicial; el tipo de cada
 * filtro sale de su valor inicial (texto, número o sí/no).
 */
export function filtrosDesdeUrl<T extends { [K in keyof T]: Valor }>(
  params: ParamMap,
  iniciales: T,
): T {
  const resultado: Record<string, Valor> = { ...(iniciales as Record<string, Valor>) };
  for (const [clave, inicial] of Object.entries(iniciales as Record<string, Valor>)) {
    if (!params.has(clave)) {
      continue;
    }
    const texto = params.get(clave) ?? '';
    if (typeof inicial === 'boolean') {
      resultado[clave] = texto === 'true';
    } else if (typeof inicial === 'number') {
      const n = Number(texto);
      resultado[clave] = Number.isFinite(n) ? n : inicial;
    } else {
      resultado[clave] = texto;
    }
  }
  return resultado as unknown as T;
}

/** Parámetros para `router.navigate([], { queryParams, queryParamsHandling: 'merge' })`. */
export function filtrosAUrl<T extends { [K in keyof T]: Valor }>(filtros: T, iniciales: T): Params {
  const params: Params = {};
  const inicial = iniciales as Record<string, Valor>;
  for (const [clave, valor] of Object.entries(filtros as Record<string, Valor>)) {
    // null quita el parámetro cuando vuelve a su valor inicial.
    params[clave] = valor === inicial[clave] ? null : String(valor);
  }
  return params;
}
