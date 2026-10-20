import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { AuthService } from '../../../../core/auth/auth.service';
import { mensajeDeError } from '../../../../core/http/api-error';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import {
  POLITICA_CONTRASENA,
  camposIguales,
} from '../../../../shared/validators/contrasena.validators';
import { SesionActiva } from '../../models/cuenta.model';
import { CuentaService } from '../../services/cuenta.service';

/** Mi cuenta: cambiar contrasena y ver/cerrar las sesiones abiertas. */
@Component({
  selector: 'app-mi-cuenta',
  imports: [Esqueleto, Encabezado, ReactiveFormsModule, FechaHoraPipe],
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiCuenta implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly cuentaService = inject(CuentaService);
  private readonly notificaciones = inject(Notificaciones);
  private readonly confirmacion = inject(Confirmacion);
  private readonly destroyRef = inject(DestroyRef);

  readonly sesion = this.auth.sesion;

  // ── Contrasena ──────────────────────────────────────────────────
  readonly guardando = signal(false);
  readonly errorContrasena = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      contrasenaActual: ['', [Validators.required]],
      contrasenaNueva: ['', [Validators.required, Validators.pattern(POLITICA_CONTRASENA)]],
      confirmacion: ['', [Validators.required]],
    },
    { validators: camposIguales('contrasenaNueva', 'confirmacion') },
  );

  // ── Sesiones ────────────────────────────────────────────────────
  readonly sesiones = signal<SesionActiva[]>([]);
  readonly cargandoSesiones = signal(true);
  readonly errorSesiones = signal<string | null>(null);
  readonly cerrandoId = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarSesiones();
  }

  cambiarContrasena(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.guardando()) {
      return;
    }
    this.guardando.set(true);
    this.errorContrasena.set(null);

    const { contrasenaActual, contrasenaNueva } = this.form.getRawValue();
    this.cuentaService
      .cambiarContrasena({ contrasenaActual, contrasenaNueva })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.notificaciones.exito('Contraseña actualizada.');
          this.form.reset();
          // El backend cerro las demas sesiones: se refresca la lista.
          this.cargarSesiones();
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.errorContrasena.set(mensajeDeError(err, 'No se pudo cambiar la contrasena.'));
        },
      });
  }

  async cerrarSesion(sesion: SesionActiva): Promise<void> {
    const ok = await this.confirmacion.pedir({
      titulo: sesion.actual ? '¿Cerrar tu sesión?' : '¿Cerrar esa sesión?',
      mensaje: sesion.actual
        ? 'Saldrás de la aplicación en este dispositivo.'
        : 'Ese dispositivo tendrá que volver a iniciar sesión.',
      aceptar: 'Sí, cerrar sesión',
      peligro: true,
    });
    if (!ok) {
      return;
    }
    if (sesion.actual) {
      this.auth.cerrarSesion();
      return;
    }
    this.ejecutarCierre(sesion.id, this.cuentaService.cerrarSesion(sesion.id));
  }

  async cerrarOtras(): Promise<void> {
    const ok = await this.confirmacion.pedir({
      titulo: '¿Cerrar las demás sesiones?',
      mensaje: 'Todos tus otros dispositivos tendrán que volver a iniciar sesión.',
      aceptar: 'Sí, cerrar las demás',
      peligro: true,
    });
    if (!ok) {
      return;
    }
    this.ejecutarCierre('otras', this.cuentaService.cerrarOtrasSesiones());
  }

  private ejecutarCierre(id: string, accion: Observable<void>): void {
    if (this.cerrandoId()) {
      return;
    }
    this.cerrandoId.set(id);
    this.errorSesiones.set(null);
    accion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.cerrandoId.set(null);
        this.cargarSesiones();
      },
      error: (err: unknown) => {
        this.cerrandoId.set(null);
        this.errorSesiones.set(mensajeDeError(err, 'No se pudo cerrar la sesion.'));
      },
    });
  }

  private cargarSesiones(): void {
    this.cargandoSesiones.set(true);
    this.errorSesiones.set(null);
    this.cuentaService
      .listarSesiones()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sesiones) => {
          this.sesiones.set(sesiones);
          this.cargandoSesiones.set(false);
        },
        error: (err: unknown) => {
          this.cargandoSesiones.set(false);
          this.errorSesiones.set(mensajeDeError(err, 'No se pudieron cargar tus sesiones.'));
        },
      });
  }
}
