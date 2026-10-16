import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs';
import { PermisosService } from '../../../../core/auth/permisos';
import { codigoDeError, mensajeDeError } from '../../../../core/http/api-error';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { hoyIso, nuevaClave } from '../../../../shared/util/fechas';
import { PATRON_MONTO, aNumero, aTexto } from '../../../../shared/util/montos';
import { TipoPrenda } from '../../../catalogo/models/tipo-prenda.model';
import { TipoPrendaService } from '../../../catalogo/services/tipo-prenda.service';
import { Cliente } from '../../../clientes/models/cliente.model';
import { ClienteService } from '../../../clientes/services/cliente.service';
import { MiembroAsignable } from '../../../equipo/models/empleado.model';
import { EmpleadoService } from '../../../equipo/services/empleado.service';
import { METODOS_PAGO, MetodoPago, Pedido, PrendaRequest } from '../../models/pedido.model';
import { PedidoService } from '../../services/pedido.service';

const CON_TEXTO = /\S/;
const TELEFONO = /^[0-9]{7,15}$/;

type FilaPrenda = FormGroup<{
  id: FormControl<string | null>;
  tipoPrendaId: FormControl<string>;
  cantidad: FormControl<number>;
  descripcion: FormControl<string>;
  precio: FormControl<string>;
  sastreId: FormControl<string>;
}>;

/**
 * Nuevo pedido y edición (solo admin). Al crear, el primer dato es el teléfono: si ya es
 * de un cliente, se rellenan nombre y apellido (solo lectura); si no, el cliente se crea
 * junto con el pedido. Cada prenda precarga el precio sugerido de su tipo. El total y el
 * saldo se calculan en vivo; la clave de idempotencia evita duplicar el pedido al
 * reintentar.
 */
@Component({
  selector: 'app-pedido-form',
  imports: [ReactiveFormsModule, RouterLink, MonedaPipe],
  templateUrl: './pedido-form.html',
  styleUrl: './pedido-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly pedidos = inject(PedidoService);
  private readonly clientes = inject(ClienteService);
  private readonly tiposService = inject(TipoPrendaService);
  private readonly empleados = inject(EmpleadoService);
  private readonly permisos = inject(PermisosService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly metodos = METODOS_PAGO;
  readonly hoy = hoyIso();
  readonly puedeAsignar = computed(() => this.permisos.puede('ASIGNAR_SASTRE'));
  readonly puedeCobrar = computed(() => this.permisos.puede('REGISTRAR_ABONOS'));

  /** Pedido en edición (null = nuevo). */
  readonly editando = signal<Pedido | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly tipos = signal<TipoPrenda[]>([]);
  readonly sastres = signal<MiembroAsignable[]>([]);

  /** Cliente dueño del teléfono escrito (null = cliente nuevo). */
  readonly clienteEncontrado = signal<Cliente | null>(null);
  readonly buscandoCliente = signal(false);
  readonly telefonoConsultado = signal(false);
  readonly errorTelefono = signal<string | null>(null);

  /** Clave de la operación: se conserva al reintentar para no duplicar el pedido. */
  private clave = nuevaClave();

  readonly form = this.fb.nonNullable.group({
    telefono: ['', [Validators.required, Validators.pattern(TELEFONO)]],
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
    prendas: this.fb.array<FilaPrenda>([]),
    fechaEntrega: ['', [Validators.required]],
    descuento: ['', [Validators.pattern(PATRON_MONTO)]],
    abonoMonto: ['', [Validators.pattern(PATRON_MONTO)]],
    abonoMetodo: ['EFECTIVO' as MetodoPago],
  });

  get filas(): FormArray<FilaPrenda> {
    return this.form.controls.prendas;
  }

  private readonly valores = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue()),
    ),
    { initialValue: this.form.getRawValue() },
  );

  readonly subtotal = computed(() =>
    this.valores().prendas.reduce(
      (suma, p) => suma + (aNumero(p.precio) ?? 0) * (Number(p.cantidad) || 0),
      0,
    ),
  );
  readonly descuento = computed(() => aNumero(this.valores().descuento) ?? 0);
  readonly total = computed(() => Math.max(this.subtotal() - this.descuento(), 0));
  readonly abono = computed(() => aNumero(this.valores().abonoMonto) ?? 0);
  readonly descuentoInvalido = computed(() => this.descuento() > this.subtotal());
  readonly abonoInvalido = computed(() => !this.editando() && this.abono() > this.total());
  /** En edición: lo ya abonado no puede quedar por encima del nuevo total. */
  readonly totalBajoAbonado = computed(() => {
    const p = this.editando();
    return p !== null && this.total() < p.abonado;
  });
  readonly saldo = computed(() => {
    const p = this.editando();
    return Math.max(this.total() - (p ? p.abonado : this.abono()), 0);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.empleados
      .asignables()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (l) => this.sastres.set(l), error: () => undefined });

    if (id) {
      this.cargarParaEditar(id);
      return;
    }
    this.cargarTipos(new Set());
    this.agregarPrenda();
    this.form.controls.telefono.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((tel) => this.buscarCliente(tel.trim()));
  }

  agregarPrenda(): void {
    this.filas.push(this.nuevaFila());
  }

  quitarPrenda(indice: number): void {
    if (this.filas.length > 1) {
      this.filas.removeAt(indice);
    }
  }

  /** Al elegir el tipo se precarga el precio sugerido (si el precio está vacío). */
  alCambiarTipo(fila: FilaPrenda): void {
    const tipo = fila.controls.tipoPrendaId.value;
    if (!tipo || fila.controls.precio.value.trim()) {
      return;
    }
    this.tiposService
      .precioSugerido(tipo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          if (s.precio !== null && !fila.controls.precio.value.trim()) {
            fila.controls.precio.setValue(aTexto(s.precio));
          }
        },
        error: () => undefined,
      });
  }

  enviar(): void {
    if (
      this.form.invalid ||
      this.descuentoInvalido() ||
      this.abonoInvalido() ||
      this.totalBajoAbonado()
    ) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.guardando()) {
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    const prendas: PrendaRequest[] = v.prendas.map((p) => ({
      id: p.id,
      tipoPrendaId: p.tipoPrendaId,
      sastreId: p.sastreId || null,
      cantidad: Number(p.cantidad),
      descripcion: p.descripcion.trim(),
      precioUnitario: aNumero(p.precio) ?? 0,
    }));
    const descuento = aNumero(v.descuento);
    const actual = this.editando();

    const peticion = actual
      ? this.pedidos.actualizar(actual.id, actual.version, {
          fechaEntrega: v.fechaEntrega,
          descuento,
          prendas,
        })
      : this.pedidos.crear(
          {
            clienteId: this.clienteEncontrado()?.id ?? null,
            clienteNuevo: this.clienteEncontrado()
              ? null
              : {
                  nombre: v.nombre.trim(),
                  apellido: v.apellido.trim(),
                  telefono: v.telefono.trim(),
                },
            fechaEntrega: v.fechaEntrega,
            descuento,
            prendas: prendas.map((p) => ({ ...p, id: null })),
            abonoInicial:
              this.puedeCobrar() && this.abono() > 0
                ? { monto: this.abono(), metodo: v.abonoMetodo }
                : null,
          },
          this.clave,
        );

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (pedido) => {
        this.guardando.set(false);
        this.clave = nuevaClave();
        this.router.navigate(['/pedidos', pedido.id]);
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        const codigo = codigoDeError(err);
        if (codigo === 'TELEFONO_EN_USO') {
          // Otra persona registró ese teléfono mientras tanto: se vuelve a consultar.
          this.buscarCliente(v.telefono.trim());
        }
        this.error.set(mensajeDeError(err, 'No se pudo guardar el pedido.'));
      },
    });
  }

  private buscarCliente(telefono: string): void {
    this.errorTelefono.set(null);
    if (!TELEFONO.test(telefono)) {
      this.telefonoConsultado.set(false);
      this.usarClienteNuevo();
      return;
    }
    this.buscandoCliente.set(true);
    this.clientes
      .porTelefono(telefono)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cliente) => {
          this.buscandoCliente.set(false);
          this.telefonoConsultado.set(true);
          this.clienteEncontrado.set(cliente);
          this.form.controls.nombre.setValue(cliente.nombre);
          this.form.controls.apellido.setValue(cliente.apellido);
          this.form.controls.nombre.disable();
          this.form.controls.apellido.disable();
        },
        error: (err: unknown) => {
          this.buscandoCliente.set(false);
          if (codigoDeError(err) === 'CLIENTE_NO_ENCONTRADO') {
            this.telefonoConsultado.set(true);
            this.usarClienteNuevo();
          } else {
            this.errorTelefono.set('No se pudo consultar');
          }
        },
      });
  }

  /** Teléfono sin dueño: nombre y apellido se escriben (si venían rellenados, se limpian). */
  private usarClienteNuevo(): void {
    if (this.clienteEncontrado()) {
      this.form.controls.nombre.setValue('');
      this.form.controls.apellido.setValue('');
      this.form.controls.nombre.markAsUntouched();
      this.form.controls.apellido.markAsUntouched();
    }
    this.clienteEncontrado.set(null);
    this.form.controls.nombre.enable();
    this.form.controls.apellido.enable();
  }

  private cargarParaEditar(id: string): void {
    this.cargando.set(true);
    this.pedidos
      .obtener(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.cargando.set(false);
          this.editando.set(p);
          // En edición el cliente no cambia: no se valida ni se envía.
          this.form.controls.telefono.disable();
          this.form.controls.nombre.disable();
          this.form.controls.apellido.disable();
          this.form.patchValue({
            telefono: p.cliente.telefono,
            nombre: p.cliente.nombre,
            apellido: p.cliente.apellido,
            fechaEntrega: p.fechaEntrega,
            descuento: p.descuento > 0 ? aTexto(p.descuento) : '',
          });
          for (const pr of p.prendas) {
            const fila = this.nuevaFila();
            fila.patchValue({
              id: pr.id,
              tipoPrendaId: pr.tipoPrendaId,
              cantidad: pr.cantidad,
              descripcion: pr.descripcion,
              precio: aTexto(pr.precioUnitario),
              sastreId: pr.sastreId ?? '',
            });
            if (pr.estado === 'ENTREGADO') {
              // Una prenda entregada no se modifica ni se quita.
              fila.disable();
            }
            this.filas.push(fila);
          }
          this.cargarTipos(new Set(p.prendas.map((pr) => pr.tipoPrendaId)));
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo cargar el pedido.'));
        },
      });
  }

  /** Tipos activos, más los ya usados en el pedido aunque se hayan desactivado. */
  private cargarTipos(usados: Set<string>): void {
    this.tiposService
      .listar(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => this.tipos.set(lista.filter((t) => t.activo || usados.has(t.id))),
        error: (err: unknown) =>
          this.error.set(mensajeDeError(err, 'No se pudo cargar el catálogo de prendas.')),
      });
  }

  esEntregada(indice: number): boolean {
    return this.filas.at(indice).disabled;
  }

  private nuevaFila(): FilaPrenda {
    return this.fb.nonNullable.group({
      id: this.fb.control<string | null>(null),
      tipoPrendaId: ['', [Validators.required]],
      cantidad: [1, [Validators.required, Validators.min(1), Validators.max(999)]],
      descripcion: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(200),
          Validators.pattern(CON_TEXTO),
        ],
      ],
      precio: ['', [Validators.required, Validators.pattern(PATRON_MONTO), precioPositivo]],
      sastreId: [''],
    });
  }
}

function precioPositivo(control: { value: string }): { cero: true } | null {
  const n = aNumero(control.value);
  return n !== null && n <= 0 ? { cero: true } : null;
}
