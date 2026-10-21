import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarcoPublico } from '../../components/marco-publico/marco-publico';
import { RESPONSABLE, SeccionPublica } from '../../models/seccion.model';

/** Contacto (Manual §16.1, entrega H): correo, teléfono y WhatsApp del responsable. */
@Component({
  selector: 'app-contacto',
  imports: [MarcoPublico],
  template: `<app-marco-publico
    titulo="Contacto"
    [introduccion]="introduccion"
    [secciones]="secciones"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contacto {
  readonly introduccion =
    '¿Quieres activar un plan, tienes una pregunta o necesitas ayuda con tu sastrería? Escríbenos o llámanos.';

  readonly secciones: SeccionPublica[] = [
    {
      titulo: 'Escríbenos',
      enlaces: [
        { etiqueta: 'Correo', texto: RESPONSABLE.correo, url: `mailto:${RESPONSABLE.correo}` },
        { etiqueta: 'WhatsApp', texto: RESPONSABLE.telefono, url: RESPONSABLE.whatsappUrl },
        {
          etiqueta: 'Teléfono',
          texto: RESPONSABLE.telefono,
          url: `tel:${RESPONSABLE.telefonoUrl}`,
        },
      ],
    },
    {
      titulo: 'Para qué puedes escribirnos',
      lista: [
        'Activar o renovar el plan de tu sastrería.',
        'Ayuda para recuperar una sastrería que eliminaste (dentro de los 90 días; también puedes hacerlo tú mismo iniciando sesión).',
        'Ejercer tus derechos sobre tus datos personales (conocer, actualizar, corregir o eliminar).',
        'Reportar un problema o proponer una mejora.',
      ],
    },
    {
      titulo: 'Responsable',
      parrafos: [`${RESPONSABLE.nombre} · Colombia.`],
    },
  ];
}
