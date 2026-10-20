import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Nombres de ícono disponibles. */
export type NombreIcono =
  | 'pedidos'
  | 'inventario'
  | 'gastos'
  | 'caja'
  | 'informes'
  | 'equipo'
  | 'ajustes'
  | 'ojo'
  | 'ojo-cerrado'
  | 'menu'
  | 'cerrar'
  | 'historial'
  | 'clientes'
  | 'proceso'
  | 'finalizado'
  | 'entregado'
  | 'anulado'
  | 'todo'
  | 'recargar'
  | 'filtros'
  | 'flecha-derecha'
  | 'percha'
  | 'usuario'
  | 'tienda'
  | 'mas'
  | 'buscar'
  | 'editar'
  | 'eliminar';

/**
 * Ícono de línea reutilizable (SVG inline). Hereda el color con `currentColor`
 * y el tamaño del contenedor; quien lo use le da el tamaño con una clase/estilo.
 */
@Component({
  selector: 'app-icono',
  templateUrl: './icono.html',
  styleUrl: './icono.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icono {
  readonly nombre = input.required<NombreIcono>();
}
