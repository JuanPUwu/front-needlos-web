import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SastreriaResumen } from '../../../../core/auth/auth.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import { CrearSastreriaModal } from '../crear-sastreria-modal/crear-sastreria-modal';

/** Máximo de sastrerías por cuenta (igual que el backend, AuthService.MAXIMO_SASTRERIAS). */
export const MAXIMO_SASTRERIAS = 5;

/**
 * Mis sastrerías (dueño 2026-10-20): tarjeta de Mi cuenta con las sastrerías de la cuenta (la
 * actual marcada y el rol en cada una) para pasar a otra sin volver a iniciar sesión, y
 * "Crear otra sastrería". No la ven el SuperAdmin ni el modo soporte (lo decide Mi cuenta).
 */
@Component({
  selector: 'app-mis-sastrerias',
  imports: [TituloBloque, Esqueleto, CrearSastreriaModal],
  templateUrl: './mis-sastrerias.html',
  styleUrl: './mis-sastrerias.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisSastrerias implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly maximo = MAXIMO_SASTRERIAS;
  readonly crearAbierto = signal(false);
  readonly sastrerias = signal<SastreriaResumen[] | null>(null);
  readonly cambiando = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly actual = computed(() => this.auth.sesion()?.sastreria?.tenantId ?? null);
  readonly alLimite = computed(() => (this.sastrerias()?.length ?? 0) >= MAXIMO_SASTRERIAS);

  ngOnInit(): void {
    this.cargar();
  }

  cambiar(s: SastreriaResumen): void {
    if (s.tenantId === this.actual() || this.cambiando()) {
      return;
    }
    this.cambiando.set(s.tenantId);
    this.error.set(null);
    this.auth
      .cambiarSastreria(s.tenantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err: unknown) => {
          this.cambiando.set(null);
          this.error.set(mensajeDeError(err, 'No se pudo cambiar de sastrería.'));
        },
      });
  }

  etiquetaRol(s: SastreriaResumen): string {
    return s.roles.includes('SASTRE_ADMIN') ? 'Administrador' : 'Sastre';
  }

  private cargar(): void {
    this.error.set(null);
    this.auth
      .misSastrerias()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => this.sastrerias.set(lista),
        error: (err: unknown) =>
          this.error.set(mensajeDeError(err, 'No se pudieron cargar tus sastrerías.')),
      });
  }
}
