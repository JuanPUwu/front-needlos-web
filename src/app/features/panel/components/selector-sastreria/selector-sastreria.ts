import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SastreriaResumen } from '../../../../core/auth/auth.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Icono } from '../../../../shared/ui/icono/icono';
import { CrearSastreriaModal } from '../crear-sastreria-modal/crear-sastreria-modal';

/**
 * Mis sastrerías (dueño 2026-10-20): botón junto al perfil de la barra lateral que abre la lista
 * de las sastrerías de la cuenta (la actual marcada) para pasar a otra sin volver a iniciar
 * sesión, y "Crear otra sastrería".
 */
@Component({
  selector: 'app-selector-sastreria',
  imports: [Icono, CrearSastreriaModal],
  templateUrl: './selector-sastreria.html',
  styleUrl: './selector-sastreria.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'alClicFuera($event)',
    '(document:keydown.escape)': 'abierto.set(false)',
  },
})
export class SelectorSastreria {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly abierto = signal(false);
  readonly crearAbierto = signal(false);
  readonly sastrerias = signal<SastreriaResumen[] | null>(null);
  readonly cambiando = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly actual = computed(() => this.auth.sesion()?.sastreria?.tenantId ?? null);

  alternar(): void {
    this.abierto.update((a) => !a);
    if (this.abierto()) {
      this.cargar();
    }
  }

  alClicFuera(evento: MouseEvent): void {
    if (this.abierto() && !this.host.contains(evento.target as Node)) {
      this.abierto.set(false);
    }
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

  abrirCrear(): void {
    this.abierto.set(false);
    this.crearAbierto.set(true);
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
