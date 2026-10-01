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
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
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
  imports: [ReactiveFormsModule, RouterLink, FechaHoraPipe],
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiCuenta implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly cuentaService = inject(CuentaService);
  private readonly destroyRef = inject(DestroyRef);

  readonly sesion = this.auth.sesion;
  readonly rutaVolver = this.auth.rutaInicial();

  // ── Contrasena ──────────────────────────────────────────────────
  readonly guardando = signal(false);
  readonly errorContrasena = signal<string | null>(null);
  readonly exitoContrasena = signal(false);

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
    this.exitoContrasena.set(false);

    const { contrasenaActual, contrasenaNueva } = this.form.getRawValue();
    this.cuentaService
      .cambiarContrasena({ contrasenaActual, contrasenaNueva })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.exitoContrasena.set(true);
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

  cerrarSesion(sesion: SesionActiva): void {
    if (sesion.actual) {
      this.auth.cerrarSesion();
      return;
    }
    this.ejecutarCierre(sesion.id, this.cuentaService.cerrarSesion(sesion.id));
  }

  cerrarOtras(): void {
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
