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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import { InvitacionSuperAdmin, SuperAdmin, SuperAdmins } from '../../models/plataforma.model';
import { EstadoSuperAdmin } from '../../services/estado-super-admin';
import { PlataformaService } from '../../services/plataforma.service';

/**
 * SuperAdmins (Manual §16). Todos ven quiénes son; solo el SuperAdmin principal invita por correo,
 * cancela invitaciones y elimina (con confirmación). Al principal nunca se le elimina. Mientras
 * carga, las mismas tarjetas con piezas grises (la forma depende de si soy el principal).
 */
@Component({
  selector: 'app-super-admin-superadmins',
  imports: [ReactiveFormsModule, Encabezado, TituloBloque, FechaHoraPipe],
  templateUrl: './superadmins.html',
  styleUrl: './superadmins.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminSuperAdmins implements OnInit {
  private readonly service = inject(PlataformaService);
  private readonly estado = inject(EstadoSuperAdmin);
  private readonly confirmacion = inject(Confirmacion);
  private readonly notificaciones = inject(Notificaciones);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly datos = signal<SuperAdmins | null>(null);
  readonly error = signal<string | null>(null);
  readonly errorInvitar = signal<string | null>(null);
  readonly ocupado = signal(false);

  /** Lo que se pinta: los datos o, mientras llegan, el esqueleto con la forma esperada. */
  readonly vista = computed<SuperAdmins>(
    () =>
      this.datos() ?? {
        soyPrincipal: this.estado.principal(),
        superAdmins: [
          {
            id: 'esqueleto',
            nombre: 'Nombre',
            apellido: 'Apellido',
            email: 'correo@ejemplo.com',
            principal: true,
          },
        ],
        invitaciones: [],
      },
  );

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(60)]],
    apellido: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  invitar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.ocupado()) {
      return;
    }
    const v = this.form.getRawValue();
    const datos = { nombre: v.nombre.trim(), apellido: v.apellido.trim(), email: v.email.trim() };
    this.ocupado.set(true);
    this.errorInvitar.set(null);
    this.service
      .invitarSuperAdmin(datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.ocupado.set(false);
          this.form.reset();
          this.notificaciones.exito(`Invitación enviada a ${datos.email}.`);
          this.cargar();
        },
        error: (err: unknown) => {
          this.ocupado.set(false);
          this.errorInvitar.set(mensajeDeError(err, 'No se pudo enviar la invitación.'));
        },
      });
  }

  async cancelarInvitacion(inv: InvitacionSuperAdmin): Promise<void> {
    const ok = await this.confirmacion.pedir({
      titulo: `¿Cancelar la invitación a ${inv.email}?`,
      mensaje: 'El enlace que le llegó dejará de funcionar.',
      aceptar: 'Sí, cancelar',
      peligro: true,
    });
    if (ok) {
      this.ejecutar(this.service.cancelarInvitacion(inv.id), 'Invitación cancelada.');
    }
  }

  async eliminar(sa: SuperAdmin): Promise<void> {
    const ok = await this.confirmacion.pedir({
      titulo: `¿Eliminar a ${sa.nombre} ${sa.apellido}?`,
      mensaje:
        'Dejará de ser SuperAdmin y no podrá volver a entrar; se cierran sus sesiones. Queda en el registro.',
      aceptar: 'Sí, eliminar',
      peligro: true,
    });
    if (ok) {
      this.ejecutar(this.service.eliminarSuperAdmin(sa.id), 'SuperAdmin eliminado.');
    }
  }

  private ejecutar(peticion: ReturnType<PlataformaService['eliminarSuperAdmin']>, mensaje: string) {
    this.ocupado.set(true);
    this.error.set(null);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.notificaciones.exito(mensaje);
        this.cargar();
      },
      error: (err: unknown) => {
        this.ocupado.set(false);
        this.error.set(mensajeDeError(err, 'No se pudo hacer el cambio.'));
      },
    });
  }

  private cargar(): void {
    this.service
      .superAdmins()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => this.datos.set(d),
        error: (err: unknown) =>
          this.error.set(mensajeDeError(err, 'No se pudieron cargar los SuperAdmins.')),
      });
  }
}
