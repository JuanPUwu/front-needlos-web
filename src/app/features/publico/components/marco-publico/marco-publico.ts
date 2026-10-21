import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { Logo } from '../../../../shared/ui/logo/logo';
import { PiePublico } from '../../../../shared/ui/pie-publico/pie-publico';
import { SeccionPublica } from '../../models/seccion.model';

/**
 * Marco de las páginas públicas (Manual §16.1, entrega H): logo, título, el texto en una tarjeta
 * de lectura cómoda (secciones con párrafos, listas y enlaces) y el pie con las demás páginas.
 * Arriba, volver al inicio de sesión (o a la app si ya hay sesión).
 */
@Component({
  selector: 'app-marco-publico',
  imports: [RouterLink, Logo, PiePublico],
  templateUrl: './marco-publico.html',
  styleUrl: './marco-publico.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarcoPublico {
  readonly titulo = input.required<string>();
  readonly introduccion = input<string | null>(null);
  readonly secciones = input.required<SeccionPublica[]>();
  /** "Última actualización: …" (solo en los textos legales). */
  readonly actualizado = input<string | null>(null);

  private readonly auth = inject(AuthService);
  readonly volver = computed(() =>
    this.auth.autenticado()
      ? { ruta: this.auth.rutaInicial(), texto: 'Volver a NeedlOS' }
      : { ruta: '/login', texto: 'Iniciar sesión' },
  );
}
