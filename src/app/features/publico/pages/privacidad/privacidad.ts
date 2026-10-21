import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarcoPublico } from '../../components/marco-publico/marco-publico';
import { RESPONSABLE, SeccionPublica } from '../../models/seccion.model';

/**
 * Política de tratamiento de datos personales (Ley 1581 de 2012 y Decreto 1377 de 2013; Manual
 * §16.1, entrega H). Borrador: debe revisarlo un abogado antes del primer cliente real.
 */
@Component({
  selector: 'app-privacidad',
  imports: [MarcoPublico],
  template: `<app-marco-publico
    titulo="Política de privacidad"
    [actualizado]="actualizado"
    [introduccion]="introduccion"
    [secciones]="secciones"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Privacidad {
  readonly actualizado = RESPONSABLE.actualizado;
  readonly introduccion =
    'Esta política explica qué datos personales trata NeedlOS, para qué, cómo los protegemos y cómo puedes ejercer tus derechos, de acuerdo con la Ley 1581 de 2012, el Decreto 1377 de 2013 y demás normas de protección de datos de Colombia.';

  readonly secciones: SeccionPublica[] = [
    {
      titulo: '1. Responsable',
      parrafos: [
        `${RESPONSABLE.nombre}, en Colombia, es el responsable del tratamiento de los datos de las cuentas de NeedlOS. Contacto: ${RESPONSABLE.correo} · ${RESPONSABLE.telefono}.`,
        'Sobre los datos de los clientes que cada sastrería registra (por ejemplo, nombre y teléfono de quien deja una prenda), la sastrería es la responsable y NeedlOS actúa como encargado: solo los trata por cuenta de la sastrería y para prestarle el servicio.',
      ],
    },
    {
      titulo: '2. Qué datos tratamos',
      lista: [
        'De las personas con cuenta (dueños y equipo): nombre, apellido, correo, teléfono y número de documento (opcionales), contraseña cifrada, y datos de uso como sesiones abiertas, dispositivo e IP de acceso.',
        'De la sastrería: nombre, NIT, dirección, teléfono y su información de trabajo (pedidos, abonos, gastos, inventario).',
        'De los clientes de cada sastrería: nombre, apellido y teléfono, y sus pedidos y abonos.',
        'No pedimos datos sensibles (salud, origen, creencias, biometría) ni datos de tarjetas.',
      ],
    },
    {
      titulo: '3. Para qué los usamos',
      lista: [
        'Prestar el servicio: crear tu cuenta, permitirte entrar, guardar y mostrar la información de tu sastrería.',
        'Seguridad: verificar tu correo, recuperar tu contraseña, detectar accesos indebidos y bloquear intentos repetidos.',
        'Comunicarnos contigo sobre tu cuenta y tu plan: vencimientos, avisos de seguridad, invitaciones y cambios importantes.',
        'Dar soporte cuando lo necesites.',
        'No vendemos ni alquilamos tus datos, ni los usamos para publicidad de terceros.',
      ],
    },
    {
      titulo: '4. Con quién los compartimos',
      parrafos: [
        'Solo con proveedores que necesitamos para operar, y únicamente para eso: Cloudflare (conexión segura al servicio y envío de correos) y Google (si eliges iniciar sesión con tu cuenta de Google). Algunos de ellos pueden procesar datos fuera de Colombia, con medidas de seguridad adecuadas. También los entregaríamos a una autoridad que los solicite conforme a la ley.',
      ],
    },
    {
      titulo: '5. Cómo los protegemos',
      lista: [
        'Las contraseñas se guardan cifradas; nadie de NeedlOS puede verlas.',
        'La sesión se mantiene con una cookie segura que el navegador no deja leer a otros sitios; puedes ver y cerrar tus sesiones abiertas en Mi cuenta.',
        'Cada sastrería solo ve su propia información.',
        'Cuando el soporte entra a tu sastrería lo hace en modo de solo lectura, queda registrado y te avisamos.',
      ],
    },
    {
      titulo: '6. Cookies',
      parrafos: [
        'Usamos únicamente una cookie técnica, necesaria para mantener tu sesión iniciada. No usamos cookies de publicidad ni de seguimiento. También guardamos en tu navegador preferencias y formularios a medio llenar para que no pierdas lo que escribiste; se borran al cerrar sesión.',
      ],
    },
    {
      titulo: '7. Cuánto tiempo los conservamos',
      lista: [
        'Mientras tu cuenta o tu sastrería existan.',
        'Si eliminas tu sastrería (o se elimina por 12 meses sin plan), conservamos su información hasta 90 días por si quieres recuperarla; después se borra para siempre.',
        'Después del borrado solo quedan los datos de facturación (nombre de la sastrería, NIT, nombre y correo del dueño, fechas e historial de planes), por obligaciones contables y legales.',
      ],
    },
    {
      titulo: '8. Tus derechos',
      parrafos: ['Como titular de tus datos puedes, en cualquier momento:'],
      lista: [
        'Conocer, actualizar y corregir tus datos (muchos puedes cambiarlos tú mismo en Mi cuenta y Mi sastrería).',
        'Pedir prueba de la autorización que nos diste.',
        'Saber qué uso le hemos dado a tus datos.',
        'Revocar la autorización o pedir que eliminemos tus datos, cuando no exista un deber legal de conservarlos.',
        'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).',
      ],
    },
    {
      titulo: '9. Cómo ejercerlos',
      parrafos: [
        `Escríbenos a ${RESPONSABLE.correo} indicando tu nombre, el correo de tu cuenta y lo que solicitas. Responderemos las consultas en un máximo de 10 días hábiles y los reclamos en un máximo de 15 días hábiles, como lo establece la ley.`,
        'Si eres cliente de una sastrería que usa NeedlOS y quieres conocer o corregir tus datos, puedes pedírselo directamente a la sastrería o escribirnos y le haremos llegar tu solicitud.',
      ],
    },
    {
      titulo: '10. Menores de edad',
      parrafos: ['NeedlOS está dirigido a negocios. No abrimos cuentas a menores de edad.'],
    },
    {
      titulo: '11. Cambios a esta política',
      parrafos: [
        'Si cambiamos esta política de forma importante te avisaremos dentro de la app o por correo. La fecha de la última actualización aparece al inicio.',
      ],
    },
  ];
}
