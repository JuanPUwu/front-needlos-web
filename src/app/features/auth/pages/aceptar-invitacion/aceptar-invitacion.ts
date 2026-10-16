import { Location } from '@angular/common';
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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { codigoDeError, mensajeDeError } from '../../../../core/http/api-error';
import { Icono } from '../../../../shared/ui/icono/icono';
import { Logo } from '../../../../shared/ui/logo/logo';
import {
  POLITICA_CONTRASENA,
  camposIguales,
} from '../../../../shared/validators/contrasena.validators';
import { InvitacionInfo, InvitacionService } from '../../services/invitacion.service';

type Estado = 'cargando' | 'formulario' | 'aceptada' | 'invalida';

/**
 * Pantalla del enlace de invitación: /aceptar-invitacion#token=...
 * Si la cuenta es nueva, la persona define su contraseña aquí; si ya existe,
 * solo acepta. Al aceptar se crea el acceso a la sastrería.
 */
@Component({
  selector: 'app-aceptar-invitacion',
  imports: [ReactiveFormsModule, RouterLink, Logo, Icono],
  templateUrl: './aceptar-invitacion.html',
  styleUrl: './aceptar-invitacion.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AceptarInvitacion implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(InvitacionService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly token = this.leerToken();

  readonly estado = signal<Estado>('cargando');
  readonly info = signal<InvitacionInfo | null>(null);
  readonly cargando = signal(false);
  readonly verPassword = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      contrasena: ['', [Validators.required, Validators.pattern(POLITICA_CONTRASENA)]],
      confirmacion: ['', [Validators.required]],
    },
    { validators: camposIguales('contrasena', 'confirmacion') },
  );

  ngOnInit(): void {
    if (!this.token) {
      this.estado.set('invalida');
      return;
    }
    this.service
      .info(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (info) => {
          this.info.set(info);
          this.estado.set('formulario');
        },
        error: () => this.estado.set('invalida'),
      });
  }

  aceptar(): void {
    const info = this.info();
    if (!this.token || !info) {
      return;
    }
    if (info.requiereContrasena && this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.cargando()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    const contrasena = info.requiereContrasena ? this.form.getRawValue().contrasena : null;
    this.service
      .aceptar(this.token, contrasena)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.estado.set('aceptada');
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          if (codigoDeError(err) === 'INVITACION_INVALIDA') {
            this.estado.set('invalida');
            return;
          }
          this.error.set(mensajeDeError(err, 'No se pudo aceptar la invitación.'));
        },
      });
  }

  private leerToken(): string | null {
    const fragmento = inject(ActivatedRoute).snapshot.fragment;
    const token = fragmento ? new URLSearchParams(fragmento).get('token') : null;
    if (fragmento) {
      inject(Location).replaceState('/aceptar-invitacion');
    }
    return token || null;
  }
}
