import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarcoPublico } from '../../components/marco-publico/marco-publico';
import { RESPONSABLE, SeccionPublica } from '../../models/seccion.model';

/** Sobre nosotros (Manual §16.1, entrega H). */
@Component({
  selector: 'app-sobre-nosotros',
  imports: [MarcoPublico],
  template: `<app-marco-publico
    titulo="Sobre nosotros"
    [introduccion]="introduccion"
    [secciones]="secciones"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SobreNosotros {
  readonly introduccion =
    'NeedlOS es el software para administrar sastrerías: cada prenda, desde que llega hasta que se entrega, en un solo lugar y desde cualquier dispositivo.';

  readonly secciones: SeccionPublica[] = [
    {
      titulo: 'Qué hace NeedlOS',
      lista: [
        'Pedidos: registra las prendas de cada cliente, a quién se asignan, su estado y la fecha de entrega.',
        'Clientes: su historial de pedidos y lo que deben.',
        'Abonos y ticket: cobra por partes y entrega un ticket claro al cliente.',
        'Resumen y gastos: lo que entró y salió de tu negocio cada día.',
        'Inventario: telas, hilos e insumos, con aviso cuando quedan pocos.',
        'Informes: ventas, cartera, productividad del equipo y lo que más se pide.',
        'Equipo: invita a tus sastres y decide qué puede hacer cada uno.',
      ],
    },
    {
      titulo: 'Por qué existe',
      parrafos: [
        'Muchas sastrerías llevan sus pedidos en cuadernos, notas o mensajes, y es fácil que una prenda se retrase, se pierda un abono o no se sepa cuánto se vendió. NeedlOS nació para que el trabajo diario sea ordenado y sencillo, sin necesidad de saber de tecnología.',
      ],
    },
    {
      titulo: 'Tus datos son tuyos',
      parrafos: [
        'La información de tu sastrería te pertenece: con un plan puedes exportarla cuando quieras y, si decides irte, la eliminamos. Lee cómo la cuidamos en nuestra Política de privacidad.',
      ],
    },
    {
      titulo: 'Quién está detrás',
      parrafos: [
        `NeedlOS es un proyecto colombiano desarrollado y operado por ${RESPONSABLE.nombre}. Si tienes preguntas, ideas o necesitas ayuda, escríbenos: te respondemos personalmente.`,
      ],
    },
  ];
}
