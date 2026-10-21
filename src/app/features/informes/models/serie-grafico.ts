import { EtiquetaGrafico } from '../../../shared/ui/grafico-lineas/grafico-lineas';
import { Agrupacion } from './informe.model';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** Horas que siempre se ven en el gráfico de un día, aunque estén en 0 (jornada típica). */
const JORNADA = { desde: 8, hasta: 18 };

/**
 * Etiquetas del eje X: por hora "8 h" (cuadro "8:00 a 8:59"); por día "20/10" (cuadro
 * "lun 20/10/2026").
 */
export function etiquetaPunto(clave: string, agrupacion: Agrupacion): EtiquetaGrafico {
  if (agrupacion === 'HORA') {
    const h = Number(clave);
    return { corta: `${h} h`, larga: `${h}:00 a ${h}:59` };
  }
  const [a, m, d] = clave.split('-');
  const dia = DIAS[new Date(Number(a), Number(m) - 1, Number(d)).getDay()];
  return { corta: `${d}/${m}`, larga: `${dia} ${d}/${m}/${a}` };
}

/**
 * Por horas, se quitan las horas vacías de los extremos, pero siempre se ve al menos la jornada
 * (8 a 18 h). Por días se ven todos.
 */
export function recortarHoras<T extends { clave: string }>(
  puntos: T[],
  agrupacion: Agrupacion,
  conDatos: (p: T) => boolean,
): T[] {
  if (agrupacion !== 'HORA') {
    return puntos;
  }
  const usadas = puntos.filter(conDatos).map((p) => Number(p.clave));
  const desde = Math.min(JORNADA.desde, ...usadas);
  const hasta = Math.max(JORNADA.hasta, ...usadas);
  return puntos.filter((p) => Number(p.clave) >= desde && Number(p.clave) <= hasta);
}
