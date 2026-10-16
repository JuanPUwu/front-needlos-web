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
import { Subject, debounceTime } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { codigoDeError, mensajeDeError } from '../../../../core/http/api-error';
import { FechaPipe } from '../../../../shared/pipes/fecha.pipe';
import {
  Cliente,
  FILTROS_CLIENTES_INICIALES,
  FiltrosClientes,
  GuardarClienteRequest,
  OrdenClientes,
} from '../../models/cliente.model';
import { ClienteService } from '../../services/cliente.service';

/** Al menos un caracter visible (el backend rechaza textos solo con espacios). */
const CON_TEXTO = /\S/;
const TELEFONO = /^[0-9]{7,15}$/;
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
  imports: [ReactiveFormsModule, FechaPipe],
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Clientes implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ClienteService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly busqueda$ = new Subject<string>();

  readonly esAdmin = computed(() => this.auth.roles().includes('SASTRE_ADMIN'));
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
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly editando = signal<Cliente | null>(null);
  readonly guardando = signal(false);
  readonly errorForm = signal<string | null>(null);
  readonly exito = signal<string | null>(null);
  /** El teléfono ya es de otro cliente (se muestra junto a la etiqueta). */
  readonly errorTelefono = signal<string | null>(null);
  /** id del cliente con la eliminación pendiente de confirmar. */
  readonly confirmarEliminarId = signal<string | null>(null);
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
    telefono: ['', [Validators.required, Validators.pattern(TELEFONO)]],
  });

  ngOnInit(): void {
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
    this.cargar(0);
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

  cancelar(): void {
    this.editando.set(null);
    this.form.reset();
    this.errorTelefono.set(null);
  }

  pedirEliminar(cliente: Cliente): void {
    this.confirmarEliminarId.set(cliente.id);
  }

  noEliminar(): void {
    this.confirmarEliminarId.set(null);
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
          this.confirmarEliminarId.set(null);
          this.exito.set(`Cliente ${cliente.nombre} ${cliente.apellido} eliminado.`);
          if (this.editando()?.id === cliente.id) {
            this.cancelar();
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
        this.exito.set(
          actual ? 'Cliente actualizado.' : `Cliente ${cliente.nombre} ${cliente.apellido} creado.`,
        );
        this.cancelar();
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
          this.cancelar();
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
    this.exito.set(null);
    this.error.set(null);
    this.errorTelefono.set(null);
  }

  private cargar(pagina: number): void {
    this.cargando.set(true);
    this.error.set(null);
    this.service
      .listar(this.filtros(), pagina, TAMANO_PAGINA)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.clientes.set(p.contenido);
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
