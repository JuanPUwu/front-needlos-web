import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ERROR_TELEFONO,
  telefonoColombia,
} from '../../../../shared/validators/telefono.validators';
import { Router, RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { Memoria } from '../../../../core/estado/memoria';
import { AuthService } from '../../../../core/auth/auth.service';
import { codigoDeError, mensajeDeError } from '../../../../core/http/api-error';
import { Icono } from '../../../../shared/ui/icono/icono';
import { PiePublico } from '../../../../shared/ui/pie-publico/pie-publico';
import { Logo } from '../../../../shared/ui/logo/logo';
import {
  POLITICA_CONTRASENA,
  camposIguales,
} from '../../../../shared/validators/contrasena.validators';
import { CompletarGoogleModal } from '../../components/completar-google-modal/completar-google-modal';
import { GoogleButton } from '../../components/google-button/google-button';

/** Al menos un caracter visible (el backend rechaza textos solo con espacios). */
const CON_TEXTO = /\S/;

/**
 * "Registrar mi sastreria": crea la sastreria en plan DEMO y la cuenta del dueno
 * (SASTRE_ADMIN), con correo y contrasena o con Google. Solo se pide el nombre
 * de la sastreria; el identificador interno lo genera el backend.
 */
@Component({
  selector: 'app-registrar-sastreria',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Logo,
    GoogleButton,
    Icono,
    PiePublico,
    CompletarGoogleModal,
  ],
  templateUrl: './registrar-sastreria.html',
  styleUrl: './registrar-sastreria.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarSastreria {
  /**
   * Nombre que el servidor rechazó por estar en uso (dos sastrerías no pueden llamarse igual):
   * mientras el campo siga con ese nombre, su línea dice "Ya existe".
   */
  readonly nombreRechazado = signal<string | null>(null);
  /** Registro con Google a medias: falta completar documento y teléfono en el popup. */
  readonly googlePendiente = signal<{ idToken: string; nombreSastreria: string } | null>(null);
  /** Teléfono de Colombia: 10 dígitos, celular 3XX o fijo 60X (dueño 2026-10-21). */
  readonly errorFormatoTelefono = ERROR_TELEFONO;
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly cargando = signal(false);
  readonly verPassword = signal(false);

  readonly politica = '8 a 72 caracteres, con mayúscula, minúscula, número y carácter especial.';
  /** El cursor está en la contraseña o su confirmación. */
  readonly enClave = signal(false);
  readonly error = signal<string | null>(null);

  /** Comun a los dos caminos (correo y Google). */
  readonly nombreSastreria = this.fb.nonNullable.control('', [
    Validators.required,
    Validators.maxLength(120),
    Validators.pattern(CON_TEXTO),
  ]);

  readonly form = this.fb.nonNullable.group(
    {
      nombreAdmin: [
        '',
        [Validators.required, Validators.maxLength(60), Validators.pattern(CON_TEXTO)],
      ],
      apellidoAdmin: [
        '',
        [Validators.required, Validators.maxLength(60), Validators.pattern(CON_TEXTO)],
      ],
      numeroDocumento: [
        '',
        [Validators.required, Validators.maxLength(30), Validators.pattern(CON_TEXTO)],
      ],
      telefono: ['', [telefonoColombia]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
      password: ['', [Validators.required, Validators.pattern(POLITICA_CONTRASENA)]],
      confirmacion: ['', [Validators.required]],
    },
    { validators: camposIguales('password', 'confirmacion') },
  );

  /** Estado de la contraseña (para el globo con la política). */
  private readonly estadoClave = toSignal(
    this.form.controls.password.statusChanges.pipe(startWith(this.form.controls.password.status)),
    { initialValue: this.form.controls.password.status },
  );
  /**
   * La política se ve (globo flotante) mientras se escribe la contraseña y aún no se
   * cumple; si sale sin cumplirla, queda el error en línea "No cumple la política".
   */
  readonly verPolitica = computed(() => this.enClave() && this.estadoClave() === 'INVALID');

  /**
   * Formulario fuera del sistema: NUNCA recuerda lo escrito; al recargar queda limpio (dueño
   * 2026-10-22). Se borra además el borrador que pudo quedar guardado de versiones anteriores.
   */
  private readonly _sinBorrador = inject(Memoria).olvidar('registro');

  enviar(): void {
    if (this.nombreSastreria.invalid || this.form.invalid) {
      this.nombreSastreria.markAsTouched();
      this.form.markAllAsTouched();
      return;
    }
    if (this.cargando()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    const datos = this.form.getRawValue();

    this.auth
      .registrarSastreria({
        nombreSastreria: this.nombreSastreria.value.trim(),
        nombreAdmin: datos.nombreAdmin.trim(),
        apellidoAdmin: datos.apellidoAdmin.trim(),
        numeroDocumento: datos.numeroDocumento.trim(),
        telefono: datos.telefono.trim() || null,
        email: datos.email.trim(),
        password: datos.password,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // Con correo no entra directo: falta confirmar el codigo de verificacion.
        next: (res) => {
          this.cargando.set(false);
          this.router.navigate(['/verificar-correo'], {
            state: { email: res.email, aviso: res.aviso },
          });
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.marcarNombreEnUso(err);
          this.error.set(
            mensajeDeError(err, 'No se pudo registrar la sastrería. Inténtalo de nuevo.'),
          );
        },
      });
  }

  conGoogle(idToken: string): void {
    if (this.nombreSastreria.invalid) {
      this.nombreSastreria.markAsTouched();
      this.error.set('Escribe el nombre de tu sastrería antes de continuar con Google.');
      return;
    }
    // Último paso en un popup: documento y teléfono (Google no los da).
    this.error.set(null);
    this.googlePendiente.set({ idToken, nombreSastreria: this.nombreSastreria.value.trim() });
  }

  /** El popup de Google encontró el nombre en uso: se cierra y se marca el campo. */
  nombreEnUsoConGoogle(mensaje: string): void {
    const pendiente = this.googlePendiente();
    this.googlePendiente.set(null);
    this.nombreRechazado.set(pendiente?.nombreSastreria ?? null);
    this.error.set(mensaje);
  }

  private marcarNombreEnUso(err: unknown): void {
    if (codigoDeError(err) === 'NOMBRE_SASTRERIA_EN_USO') {
      this.nombreRechazado.set(this.nombreSastreria.value.trim());
    }
  }
}
