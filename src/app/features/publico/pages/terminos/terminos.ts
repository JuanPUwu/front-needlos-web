import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarcoPublico } from '../../components/marco-publico/marco-publico';
import { RESPONSABLE, SeccionPublica } from '../../models/seccion.model';

/**
 * Términos y condiciones (Manual §16.1, entrega H). Borrador redactado con las reglas del
 * negocio; debe revisarlo un abogado antes del primer cliente real.
 */
@Component({
  selector: 'app-terminos',
  imports: [MarcoPublico],
  template: `<app-marco-publico
    titulo="Términos y condiciones"
    [actualizado]="actualizado"
    [introduccion]="introduccion"
    [secciones]="secciones"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Terminos {
  readonly actualizado = RESPONSABLE.actualizado;
  readonly introduccion = `Estos términos regulan el uso de NeedlOS, el software para administrar sastrerías que ofrece ${RESPONSABLE.nombre} ("NeedlOS", "nosotros"). Al registrar una sastrería o usar el servicio aceptas estos términos.`;

  readonly secciones: SeccionPublica[] = [
    {
      titulo: '1. El servicio',
      parrafos: [
        'NeedlOS permite a una sastrería registrar sus clientes, pedidos, abonos, gastos, inventario, equipo e informes desde un navegador. Lo usas tal como está disponible; lo mejoramos con el tiempo y podemos cambiar o retirar funciones avisando con anticipación razonable cuando afecten tu forma de trabajar.',
      ],
    },
    {
      titulo: '2. Tu cuenta',
      lista: [
        'Quien registra la sastrería es su administrador y responde por el uso que hagan las personas que invite.',
        'Debes dar datos verdaderos y mantener tu contraseña en secreto. Avísanos de inmediato si crees que alguien entró a tu cuenta.',
        'Cada persona usa su propia cuenta; no compartas accesos.',
      ],
    },
    {
      titulo: '3. Prueba gratis y planes',
      lista: [
        'Al registrarte tienes un periodo de prueba gratis con todas las funciones de uso diario. Exportar e importar información están incluidos solo en los planes.',
        'El plan es mensual y se activa por el número de meses que pagues. El pago se acuerda directamente con nosotros.',
        'Si tu plan está vigente, los meses nuevos se suman a su vencimiento.',
        'Un plan pagado sigue activo hasta su fecha de vencimiento. No hay devoluciones por el tiempo que no uses.',
        'Te avisamos por correo y dentro de la app antes de que venza.',
      ],
    },
    {
      titulo: '4. Sin plan activo',
      parrafos: [
        'Cuando vence la prueba o el plan, la sastrería queda sin plan activo: tu equipo puede seguir entrando y ver toda la información, pero no crear ni cambiar nada hasta activar un plan. Si tuviste un plan, puedes seguir exportando tu información.',
      ],
    },
    {
      titulo: '5. Uso aceptable',
      parrafos: [
        'No puedes usar NeedlOS para actividades ilegales o fraudulentas, para enviar contenido abusivo, para intentar acceder a información de otras sastrerías, ni para afectar el funcionamiento del servicio. Si detectamos un uso así podemos bloquear el acceso de la sastrería mientras lo revisamos; te informaremos el motivo.',
      ],
    },
    {
      titulo: '6. Tu información',
      lista: [
        'La información que registras (clientes, pedidos, montos, inventario) es de tu sastrería. Nosotros solo la tratamos para prestarte el servicio, como se explica en la Política de privacidad.',
        'Eres responsable de contar con la autorización de tus clientes para registrar sus datos personales en NeedlOS.',
        'Con un plan puedes exportar toda tu información en un archivo que se abre con Excel e importar clientes, catálogo e inventario desde otro sistema.',
      ],
    },
    {
      titulo: '7. Soporte',
      parrafos: [
        'Para ayudarte, nuestro equipo de soporte puede entrar a tu sastrería en modo de solo lectura (sin cambiar nada). Cada visita queda registrada y te avisamos dentro de la app.',
      ],
    },
    {
      titulo: '8. Eliminar tu sastrería',
      lista: [
        'Puedes eliminar tu sastrería cuando quieras desde Mi sastrería. Desde ese momento nadie de tu equipo puede entrar.',
        'Conservamos la información hasta 90 días por si cambias de opinión: inicia sesión con tu cuenta de administrador antes de que se cumplan y podrás recuperarla tal como estaba (también puedes escribirnos).',
        'Pasados los 90 días se borra para siempre. Solo conservamos los datos de facturación (nombre de la sastrería, NIT, nombre y correo del dueño, fechas e historial de planes).',
        'Si una sastrería pasa 12 meses sin plan activo, te avisamos por correo y, si no se activa un plan, se elimina siguiendo este mismo proceso.',
      ],
    },
    {
      titulo: '9. Disponibilidad y responsabilidad',
      parrafos: [
        'Hacemos nuestro mejor esfuerzo para que NeedlOS esté disponible y tu información segura, pero el servicio puede interrumpirse por mantenimiento, fallas de energía o de internet u otras causas fuera de nuestro control. En la medida que lo permita la ley, no respondemos por pérdidas indirectas, lucro cesante ni por decisiones tomadas con base en la información del sistema. Te recomendamos exportar tu información periódicamente.',
      ],
    },
    {
      titulo: '10. Cambios a estos términos',
      parrafos: [
        'Podemos actualizar estos términos. Cuando el cambio sea importante te avisaremos dentro de la app o por correo antes de que entre en vigor. Si sigues usando NeedlOS después, entendemos que aceptas los nuevos términos.',
      ],
    },
    {
      titulo: '11. Ley aplicable y contacto',
      parrafos: [
        `Estos términos se rigen por las leyes de la República de Colombia. Para cualquier duda o reclamo escríbenos a ${RESPONSABLE.correo} o al ${RESPONSABLE.telefono}.`,
      ],
    },
  ];
}
