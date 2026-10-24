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
import {
  ERROR_TELEFONO,
  telefonoColombia,
} from '../../../../shared/validators/telefono.validators';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import { AuthService } from '../../../../core/auth/auth.service';
import { PermisosService } from '../../../../core/auth/permisos';
import { filtrosAUrl, filtrosDesdeUrl } from '../../../../core/estado/filtros-url';
import { Memoria } from '../../../../core/estado/memoria';
import { recordarFormulario } from '../../../../core/estado/recordar-formulario';
import { codigoDeError, mensajeDeError } from '../../../../core/http/api-error';
import { FechaPipe } from '../../../../shared/pipes/fecha.pipe';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import {
  Cliente,
  FILTROS_CLIENTES_INICIALES,
  FiltrosClientes,
  GuardarClienteRequest,
  OrdenClientes,
} from '../../models/cliente.model';
import { ClienteService } from '../../services/cliente.service';
import { recargaAutomatica } from '../../../../core/estado/recarga-automatica';
import { BotonRecargar } from '../../../../shared/ui/boton-recargar/boton-recargar';
import { Vacio } from '../../../../shared/ui/vacio/vacio';
import { avisoFaltantes } from '../../../../shared/util/faltantes';

/** Al menos un caracter visible (el backend rechaza textos solo con espacios). */
const CON_TEXTO = /\S/;
const TAMANO_PAGINA = 20;

/** Opciones del selector de orden. */
const ORDENES: { valor: OrdenClientes; etiqueta: string }[] = [
  { valor: 'nombre,asc', etiqueta: 'Nombre (A-Z)' },
  { valor: 'apellido,asc', etiqueta: 'Apellido (A-Z)' },
  { valor: 'fechaRegistro,desc', etiqueta: 'Más recientes' },
  { valor: 'fechaRegistro,asc', etiqueta: 'Más antiguos' },
];

/**
 * Clientes de la sastrería: filtrar (texto, fecha de registro, orden), crear, editar y
 * eliminar (solo admin). El teléfono es único: si ya lo tiene otro cliente, se indica
 * en el campo con el nombre de ese cliente.
 */
@Component({
  selector: 'app-clientes',
  imports: [
    Vacio,
    BotonRecargar,
    TituloBloque,
    Esqueleto,
    Encabezado,
    ReactiveFormsModule,
    RouterLink,
    FechaPipe,
    MonedaPipe,
  ],
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Clientes implements OnInit {
  /** Teléfono de Colombia: 10 dígitos, celular 3XX o fijo 60X (dueño 2026-10-21). */
  readonly errorFormatoTelefono = ERROR_TELEFONO;
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ClienteService);
  private readonly auth = inject(AuthService);
  private readonly permisos = inject(PermisosService);
  private readonly memoria = inject(Memoria);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notificaciones = inject(Notificaciones);
  private readonly confirmacion = inject(Confirmacion);
  private readonly destroyRef = inject(DestroyRef);
  /** Formulario a medio llenar (y qué cliente se editaba): sobrevive a la recarga. */
  private readonly busqueda$ = new Subject<string>();

  readonly esAdmin = computed(() => this.auth.roles().includes('SASTRE_ADMIN'));
  /** Crear y editar exige el permiso GESTIONAR_CLIENTES (el admin lo tiene siempre). */
  readonly puedeGestionar = computed(
    () => this.esAdmin() || this.permisos.puede('GESTIONAR_CLIENTES'),
  );
  readonly ordenes = ORDENES;

  readonly clientes = signal<Cliente[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly filtros = signal<FiltrosClientes>(FILTROS_CLIENTES_INICIALES);
  readonly hayFiltros = computed(() => {
    const f = this.filtros();
    return f.buscar !== '' || f.desde !== '' || f.hasta !== '';
  });
  readonly errorFiltros = signal<string | null>(null);
  /** En pantallas angostas los filtros se pliegan detrás de un botón. */
  readonly filtrosAbiertos = signal(false);
  readonly cantidadFiltros = computed(
    () => [this.filtros().desde, this.filtros().hasta].filter(Boolean).length,
  );
  readonly cargando = signal(true);
  /** Ya cargó una vez: recargar no vuelve al esqueleto (conserva lo que se ve). */
  readonly listo = signal(false);
  readonly error = signal<string | null>(null);

  readonly editando = signal<Cliente | null>(null);
  readonly guardando = signal(false);
  readonly errorForm = signal<string | null>(null);
  /** El teléfono ya es de otro cliente (se muestra junto a la etiqueta). */
  readonly errorTelefono = signal<string | null>(null);
  readonly accionId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nombre: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(60),
        Validators.pattern(CON_TEXTO),
      ],
    ],
    apellido: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(60),
        Validators.pattern(CON_TEXTO),
      ],
    ],
    telefono: ['', [Validators.required, telefonoColombia]],
  });

  /** Formulario a medio llenar (y qué se editaba): sobrevive a la recarga. */
  private readonly borrador = recordarFormulario<{ editando: Cliente | null }>(
    this.form,
    this.memoria,
    'clientes:form',
    this.destroyRef,
    {
      extra: () => ({ editando: this.editando() }),
    },
  );

  constructor() {
    recargaAutomatica(() => this.recargar());
  }

  ngOnInit(): void {
    // Filtros y página vienen de la URL: una recarga deja la lista igual.
    const params = this.route.snapshot.queryParamMap;
    this.filtros.set(filtrosDesdeUrl(params, FILTROS_CLIENTES_INICIALES));
    this.filtrosAbiertos.set(this.cantidadFiltros() > 0);
    const guardado = this.borrador.leer();
    if (guardado) {
      this.editando.set(guardado.editando);
      this.form.patchValue(guardado.valores);
      this.form.markAsDirty();
    }
    this.busqueda$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((texto) => {
        // Se compara con el filtro vigente (no con el último texto) para que, tras
        // "Limpiar filtros", volver a escribir lo mismo sí busque.
        if (texto.trim() !== this.filtros().buscar) {
          this.cambiarFiltro({ buscar: texto.trim() });
        }
      });
    this.form.controls.telefono.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.errorTelefono.set(null));
    this.cargar(Math.max(Number(params.get('pagina')) || 1, 1) - 1);
  }

  /** Trae lo último sin perder lo que se ve. */
  recargar(): void {
    this.cargar(this.pagina());
  }

  alternarFiltros(): void {
    this.filtrosAbiertos.update((v) => !v);
  }

  alBuscar(texto: string): void {
    this.busqueda$.next(texto);
  }

  alCambiarOrden(orden: string): void {
    this.cambiarFiltro({ orden: orden as OrdenClientes });
  }

  alCambiarDesde(fecha: string): void {
    this.cambiarFiltro({ desde: fecha });
  }

  alCambiarHasta(fecha: string): void {
    this.cambiarFiltro({ hasta: fecha });
  }

  /** Quita los filtros pero conserva el orden elegido. */
  limpiarFiltros(): void {
    this.cambiarFiltro({ buscar: '', desde: '', hasta: '' });
  }

  irAPagina(pagina: number): void {
    if (pagina >= 0 && pagina < this.totalPaginas()) {
      this.cargar(pagina);
    }
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Qué falta, en un aviso que hay que aceptar (dueño 2026-10-20).
      const aviso = avisoFaltantes(
        this.form,
        this.editando() ? 'guardar el cliente' : 'crear el cliente',
        { nombre: 'el nombre', apellido: 'el apellido', telefono: 'el teléfono' },
        [],
      );
      if (aviso) {
        void this.confirmacion.avisar(aviso);
      }
      return;
    }
    if (this.guardando()) {
      return;
    }
    this.guardar(this.datos());
  }

  editar(cliente: Cliente): void {
    this.editando.set(cliente);
    this.limpiarAvisos();
    this.form.reset({
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      telefono: cliente.telefono,
    });
  }

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
    this.reiniciar();
  }

  /** Vacía el formulario y olvida el borrador sin preguntar (tras guardar, eliminar o un conflicto). */
  private reiniciar(): void {
    this.borrador.olvidar();
    this.editando.set(null);
    this.form.reset();
    this.errorTelefono.set(null);
  }

  /** Eliminar no tiene vuelta atrás desde la app: se confirma. */
  async pedirEliminar(cliente: Cliente): Promise<void> {
    const ok = await this.confirmacion.pedir({
      titulo: `¿Eliminar a ${cliente.nombre} ${cliente.apellido}?`,
      mensaje: 'El cliente dejará de aparecer en la lista y su teléfono quedará libre.',
      aceptar: 'Sí, eliminar',
      peligro: true,
    });
    if (ok) {
      this.eliminar(cliente);
    }
  }

  eliminar(cliente: Cliente): void {
    if (this.accionId()) {
      return;
    }
    this.accionId.set(cliente.id);
    this.limpiarAvisos();
    this.service
      .eliminar(cliente.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.accionId.set(null);
          this.notificaciones.exito(`Cliente ${cliente.nombre} ${cliente.apellido} eliminado.`);
          if (this.editando()?.id === cliente.id) {
            this.reiniciar();
          }
          this.cargar(this.pagina());
        },
        error: (err: unknown) => {
          this.accionId.set(null);
          this.error.set(mensajeDeError(err, 'No se pudo eliminar el cliente.'));
        },
      });
  }

  private guardar(datos: GuardarClienteRequest): void {
    this.guardando.set(true);
    this.limpiarAvisos();
    const actual = this.editando();
    const peticion = actual
      ? this.service.actualizar(actual.id, actual.version, datos)
      : this.service.crear(datos);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (cliente) => {
        this.guardando.set(false);
        this.notificaciones.exito(
          actual
            ? `Cliente ${cliente.nombre} ${cliente.apellido} actualizado.`
            : `Cliente ${cliente.nombre} ${cliente.apellido} creado.`,
        );
        this.reiniciar();
        this.cargar(actual ? this.pagina() : 0);
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        if (codigoDeError(err) === 'TELEFONO_EN_USO') {
          this.indicarDuenoDelTelefono(datos.telefono);
          return;
        }
        this.errorForm.set(mensajeDeError(err, 'No se pudo guardar el cliente.'));
        if (codigoDeError(err) === 'CONFLICTO_CONCURRENCIA') {
          // Otra persona lo editó: se recarga para trabajar sobre la versión vigente.
          this.reiniciar();
          this.cargar(this.pagina());
        }
      },
    });
  }

  /** Muestra en el campo a quién pertenece el teléfono repetido. */
  private indicarDuenoDelTelefono(telefono: string): void {
    this.errorTelefono.set('Ya es de otro cliente');
    this.service
      .porTelefono(telefono)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dueno) => this.errorTelefono.set(`Ya es de ${dueno.nombre} ${dueno.apellido}`),
        error: () => undefined,
      });
  }

  private cambiarFiltro(cambio: Partial<FiltrosClientes>): void {
    const filtros = { ...this.filtros(), ...cambio };
    this.filtros.set(filtros);
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      this.errorFiltros.set('"Desde" no puede ser posterior a "hasta".');
      return;
    }
    this.errorFiltros.set(null);
    this.cargar(0);
  }

  private datos(): GuardarClienteRequest {
    const v = this.form.getRawValue();
    return {
      nombre: v.nombre.trim(),
      apellido: v.apellido.trim(),
      telefono: v.telefono.trim(),
    };
  }

  private limpiarAvisos(): void {
    this.errorForm.set(null);
    this.error.set(null);
    this.errorTelefono.set(null);
  }

  private cargar(pagina: number): void {
    this.cargando.set(true);
    this.error.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...filtrosAUrl(this.filtros(), FILTROS_CLIENTES_INICIALES),
        pagina: pagina > 0 ? pagina + 1 : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.service
      .listar(this.filtros(), pagina, TAMANO_PAGINA)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.clientes.set(p.contenido);
          this.listo.set(true);
          this.total.set(p.totalElementos);
          this.pagina.set(p.pagina);
          this.totalPaginas.set(p.totalPaginas);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudieron cargar los clientes.'));
        },
      });
  }
}
