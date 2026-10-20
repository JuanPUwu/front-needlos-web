import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { PERMISOS, Permiso } from '../../../../core/auth/permisos';
import { ActivatedRoute, Router } from '@angular/router';
import { Memoria } from '../../../../core/estado/memoria';
import { recordarFormulario } from '../../../../core/estado/recordar-formulario';
import { mensajeDeError } from '../../../../core/http/api-error';
import { coincide } from '../../../../shared/util/texto';
import { Empleado, Invitacion } from '../../models/empleado.model';
import { EmpleadoService } from '../../services/empleado.service';

/** Al menos un caracter visible (el backend rechaza textos solo con espacios). */
const CON_TEXTO = /\S/;

export type RolFiltro = 'todos' | 'SASTRE_ADMIN' | 'SASTRE';
export type EstadoFiltro = 'todos' | 'activos' | 'inactivos';

/** Gestión del equipo: invitar por correo, miembros e invitaciones pendientes. */
@Component({
  selector: 'app-equipo',
  imports: [Esqueleto, Encabezado, ReactiveFormsModule],
  templateUrl: './equipo.html',
  styleUrl: './equipo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Equipo implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(EmpleadoService);
  private readonly memoria = inject(Memoria);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notificaciones = inject(Notificaciones);
  private readonly confirmacion = inject(Confirmacion);
  private readonly destroyRef = inject(DestroyRef);

  readonly empleados = signal<Empleado[]>([]);
  readonly invitaciones = signal<Invitacion[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly editandoId = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly errorForm = signal<string | null>(null);
  /** id (acceso o invitación) de la fila con una acción en curso. */
  readonly accionId = signal<string | null>(null);

  readonly editando = computed(() => this.editandoId() !== null);

  // Resumen para los tiles del bento.
  readonly total = computed(() => this.empleados().length);
  readonly admins = computed(
    () => this.empleados().filter((e) => e.roles.includes('SASTRE_ADMIN')).length,
  );
  readonly pendientes = computed(() => this.invitaciones().length);

  // Filtros (el equipo llega completo: se filtra en el navegador). Texto y rol aplican
  // también a las invitaciones; el estado solo a los miembros.
  // Vienen de la URL (`?buscar=&rol=&estado=`) y se escriben en ella al cambiar.
  private readonly q = this.route.snapshot.queryParamMap;
  readonly buscar = signal(this.q.get('buscar') ?? '');
  readonly rol = signal<RolFiltro>((this.q.get('rol') as RolFiltro | null) ?? 'todos');
  readonly estado = signal<EstadoFiltro>((this.q.get('estado') as EstadoFiltro | null) ?? 'todos');
  readonly hayFiltros = computed(
    () => this.buscar() !== '' || this.rol() !== 'todos' || this.estado() !== 'todos',
  );
  readonly miembrosVisibles = computed(() => {
    const rol = this.rol();
    const estado = this.estado();
    return this.empleados().filter(
      (e) =>
        coincide(this.buscar(), `${e.nombre} ${e.apellido}`, e.email) &&
        (rol === 'todos' || this.rolPrincipal(e.roles) === rol) &&
        (estado === 'todos' || (estado === 'activos') === e.activo),
    );
  });
  readonly invitacionesVisibles = computed(() => {
    const rol = this.rol();
    return this.invitaciones().filter(
      (i) =>
        coincide(this.buscar(), `${i.nombre} ${i.apellido}`, i.email) &&
        (rol === 'todos' || i.rol === rol),
    );
  });

  readonly permisosDisponibles = PERMISOS;
  /** Permisos marcados en el formulario de edición (solo aplican al rol Sastre). */
  readonly permisosElegidos = signal<Set<Permiso>>(new Set());
  /** Rol elegido en el formulario (para mostrar u ocultar los permisos). */
  readonly rolForm = signal<'SASTRE' | 'SASTRE_ADMIN'>('SASTRE');

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(60), Validators.pattern(CON_TEXTO)]],
    apellido: ['', [Validators.required, Validators.maxLength(60), Validators.pattern(CON_TEXTO)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    telefono: ['', [Validators.maxLength(20)]],
    numeroDocumento: ['', [Validators.maxLength(30)]],
    rol: ['SASTRE' as 'SASTRE' | 'SASTRE_ADMIN', [Validators.required]],
  });

  /** Formulario a medio llenar (y qué se editaba): sobrevive a la recarga. */
  private readonly borrador = recordarFormulario<{
    editandoId: string | null;
    permisos: Permiso[];
  }>(this.form, this.memoria, 'equipo:form', this.destroyRef, {
    extra: () => ({ editandoId: this.editandoId(), permisos: [...this.permisosElegidos()] }),
  });

  constructor() {
    // Filtros en la URL: una recarga deja la lista igual.
    effect(() => {
      const queryParams = {
        buscar: this.buscar() || null,
        rol: this.rol() === 'todos' ? null : this.rol(),
        estado: this.estado() === 'todos' ? null : this.estado(),
      };
      untracked(() =>
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams,
          queryParamsHandling: 'merge',
          replaceUrl: true,
        }),
      );
    });
  }

  ngOnInit(): void {
    this.form.controls.rol.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rol) => this.rolForm.set(rol));
    // Invitación o edición a medias (con sus permisos marcados): sobrevive a la recarga.
    const guardado = this.borrador.leer();
    if (guardado) {
      this.editandoId.set(guardado.editandoId);
      this.form.patchValue(guardado.valores);
      this.permisosElegidos.set(new Set(guardado.permisos));
      this.form.markAsDirty();
    }
    this.cargar();
  }

  alternarPermiso(permiso: Permiso, marcado: boolean): void {
    this.permisosElegidos.update((actual) => {
      const nuevo = new Set(actual);
      if (marcado) {
        nuevo.add(permiso);
      } else {
        nuevo.delete(permiso);
      }
      return nuevo;
    });
    // Los permisos no están en el formulario: se marca para que el borrador se guarde.
    this.form.markAsDirty();
    this.form.updateValueAndValidity();
  }

  alBuscar(texto: string): void {
    this.buscar.set(texto.trim());
  }

  alCambiarRol(rol: string): void {
    this.rol.set(rol as RolFiltro);
  }

  alCambiarEstado(estado: string): void {
    this.estado.set(estado as EstadoFiltro);
  }

  limpiarFiltros(): void {
    this.buscar.set('');
    this.rol.set('todos');
    this.estado.set('todos');
  }

  /** Un admin también puede tener SASTRE: cuenta como admin. */
  private rolPrincipal(roles: string[]): RolFiltro {
    return roles.includes('SASTRE_ADMIN') ? 'SASTRE_ADMIN' : 'SASTRE';
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
        .actualizar(id, {
          ...datos,
          permisos: datos.rol === 'SASTRE' ? [...this.permisosElegidos()] : [],
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (emp) => {
            this.guardando.set(false);
            this.reemplazar(emp);
            this.notificaciones.exito('Empleado actualizado.');
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
          this.notificaciones.exito(`Invitación enviada a ${inv.email}.`);
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
    this.errorForm.set(null);
    this.form.reset({
      nombre: emp.nombre,
      apellido: emp.apellido,
      email: emp.email,
      telefono: emp.telefono ?? '',
      numeroDocumento: emp.numeroDocumento ?? '',
      rol: emp.roles.includes('SASTRE_ADMIN') ? 'SASTRE_ADMIN' : 'SASTRE',
    });
    this.rolForm.set(emp.roles.includes('SASTRE_ADMIN') ? 'SASTRE_ADMIN' : 'SASTRE');
    this.permisosElegidos.set(new Set(emp.permisos ?? []));
  }

  /** Cancelar (o guardar con éxito) olvida el borrador. */
  /** Cancelar: si hay cambios sin guardar, pide confirmar antes de perderlos (Reglas §12.2). */
  async cancelar(): Promise<void> {
    if (
      this.form.dirty &&
      !(await this.confirmacion.pedir({
        titulo: '¿Descartar los cambios?',
        mensaje: 'Lo que escribiste no se guardará.',
        aceptar: 'Sí, descartar',
        cancelar: 'Seguir editando',
        peligro: true,
      }))
    ) {
      return;
    }
    this.borrador.olvidar();
    this.editandoId.set(null);
    this.form.reset({ rol: 'SASTRE' });
    this.rolForm.set('SASTRE');
    this.permisosElegidos.set(new Set());
  }

  async desactivar(emp: Empleado): Promise<void> {
    const ok = await this.confirmacion.pedir({
      titulo: `¿Desactivar a ${emp.nombre} ${emp.apellido}?`,
      mensaje:
        'Perderá el acceso a la sastrería de inmediato. Su historial se conserva y puedes reactivarlo.',
      aceptar: 'Sí, desactivar',
      peligro: true,
    });
    if (ok) {
      this.accionConRecarga(emp.accesoId, this.service.desactivar(emp.accesoId));
    }
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
    this.service
      .reenviarInvitacion(inv.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.accionId.set(null);
          this.notificaciones.exito(`Invitación reenviada a ${inv.email}.`);
        },
        error: (err: unknown) => {
          this.accionId.set(null);
          this.error.set(mensajeDeError(err, 'No se pudo reenviar la invitación.'));
        },
      });
  }

  async cancelarInvitacion(inv: Invitacion): Promise<void> {
    if (this.accionId()) {
      return;
    }
    const ok = await this.confirmacion.pedir({
      titulo: '¿Cancelar la invitación?',
      mensaje: `El enlace enviado a ${inv.email} dejará de funcionar.`,
      aceptar: 'Sí, cancelar invitación',
      cancelar: 'No',
      peligro: true,
    });
    if (!ok) {
      return;
    }
    this.accionId.set(inv.id);
    this.error.set(null);
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
