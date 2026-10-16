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
import { forkJoin } from 'rxjs';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Empleado, Invitacion } from '../../models/empleado.model';
import { EmpleadoService } from '../../services/empleado.service';

/** Al menos un caracter visible (el backend rechaza textos solo con espacios). */
const CON_TEXTO = /\S/;

/** Gestión del equipo: invitar por correo, miembros e invitaciones pendientes. */
@Component({
  selector: 'app-equipo',
  imports: [ReactiveFormsModule],
  templateUrl: './equipo.html',
  styleUrl: './equipo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Equipo implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(EmpleadoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly empleados = signal<Empleado[]>([]);
  readonly invitaciones = signal<Invitacion[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly editandoId = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly errorForm = signal<string | null>(null);
  readonly exito = signal<string | null>(null);
  /** id (acceso o invitación) de la fila con una acción en curso. */
  readonly accionId = signal<string | null>(null);

  readonly editando = computed(() => this.editandoId() !== null);

  // Resumen para los tiles del bento.
  readonly total = computed(() => this.empleados().length);
  readonly admins = computed(
    () => this.empleados().filter((e) => e.roles.includes('SASTRE_ADMIN')).length,
  );
  readonly pendientes = computed(() => this.invitaciones().length);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(60), Validators.pattern(CON_TEXTO)]],
    apellido: ['', [Validators.required, Validators.maxLength(60), Validators.pattern(CON_TEXTO)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    telefono: ['', [Validators.maxLength(20)]],
    numeroDocumento: ['', [Validators.maxLength(30)]],
    rol: ['SASTRE' as 'SASTRE' | 'SASTRE_ADMIN', [Validators.required]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.guardando()) {
      return;
    }
    this.guardando.set(true);
    this.errorForm.set(null);
    this.exito.set(null);

    const v = this.form.getRawValue();
    const datos = {
      nombre: v.nombre.trim(),
      apellido: v.apellido.trim(),
      telefono: v.telefono.trim() || null,
      numeroDocumento: v.numeroDocumento.trim() || null,
      rol: v.rol,
    };
    const id = this.editandoId();

    if (id) {
      this.service
        .actualizar(id, datos)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (emp) => {
            this.guardando.set(false);
            this.reemplazar(emp);
            this.exito.set('Empleado actualizado.');
            this.cancelar();
          },
          error: (err: unknown) => {
            this.guardando.set(false);
            this.errorForm.set(mensajeDeError(err, 'No se pudo guardar el empleado.'));
          },
        });
      return;
    }

    this.service
      .invitar({ ...datos, email: v.email.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (inv) => {
          this.guardando.set(false);
          this.invitaciones.update((lista) => [inv, ...lista]);
          this.exito.set(`Invitación enviada a ${inv.email}.`);
          this.cancelar();
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.errorForm.set(mensajeDeError(err, 'No se pudo enviar la invitación.'));
        },
      });
  }

  editar(emp: Empleado): void {
    this.editandoId.set(emp.accesoId);
    this.exito.set(null);
    this.errorForm.set(null);
    this.form.reset({
      nombre: emp.nombre,
      apellido: emp.apellido,
      email: emp.email,
      telefono: emp.telefono ?? '',
      numeroDocumento: emp.numeroDocumento ?? '',
      rol: emp.roles.includes('SASTRE_ADMIN') ? 'SASTRE_ADMIN' : 'SASTRE',
    });
  }

  cancelar(): void {
    this.editandoId.set(null);
    this.form.reset({ rol: 'SASTRE' });
  }

  desactivar(emp: Empleado): void {
    this.accionConRecarga(emp.accesoId, this.service.desactivar(emp.accesoId));
  }

  reactivar(emp: Empleado): void {
    this.accionConRecarga(emp.accesoId, this.service.reactivar(emp.accesoId));
  }

  reenviarInvitacion(inv: Invitacion): void {
    if (this.accionId()) {
      return;
    }
    this.accionId.set(inv.id);
    this.error.set(null);
    this.exito.set(null);
    this.service
      .reenviarInvitacion(inv.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.accionId.set(null);
          this.exito.set(`Invitación reenviada a ${inv.email}.`);
        },
        error: (err: unknown) => {
          this.accionId.set(null);
          this.error.set(mensajeDeError(err, 'No se pudo reenviar la invitación.'));
        },
      });
  }

  cancelarInvitacion(inv: Invitacion): void {
    if (this.accionId()) {
      return;
    }
    this.accionId.set(inv.id);
    this.error.set(null);
    this.exito.set(null);
    this.service
      .cancelarInvitacion(inv.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.accionId.set(null);
          this.invitaciones.update((lista) => lista.filter((i) => i.id !== inv.id));
        },
        error: (err: unknown) => {
          this.accionId.set(null);
          this.error.set(mensajeDeError(err, 'No se pudo cancelar la invitación.'));
        },
      });
  }

  esAdmin(emp: Empleado): boolean {
    return emp.roles.includes('SASTRE_ADMIN');
  }

  private accionConRecarga(id: string, peticion: ReturnType<EmpleadoService['desactivar']>): void {
    if (this.accionId()) {
      return;
    }
    this.accionId.set(id);
    this.error.set(null);
    this.exito.set(null);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.accionId.set(null);
        this.cargar();
      },
      error: (err: unknown) => {
        this.accionId.set(null);
        this.error.set(mensajeDeError(err, 'No se pudo completar la acción.'));
      },
    });
  }

  private reemplazar(emp: Empleado): void {
    this.empleados.update((lista) => lista.map((e) => (e.accesoId === emp.accesoId ? emp : e)));
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      miembros: this.service.listar(),
      invitaciones: this.service.listarInvitaciones(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ miembros, invitaciones }) => {
          this.empleados.set(miembros);
          this.invitaciones.set(invitaciones);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo cargar el equipo.'));
        },
      });
  }
}
