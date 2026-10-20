import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  input,
  output,
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
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs';
import { PermisosService } from '../../../../core/auth/permisos';
import { Memoria } from '../../../../core/estado/memoria';
import {
  FormularioRecordado,
  recordarFormulario,
} from '../../../../core/estado/recordar-formulario';
import { codigoDeError, mensajeDeError } from '../../../../core/http/api-error';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { PrendaLinea } from '../../components/prenda-linea/prenda-linea';
import { Calendario } from '../../../../shared/ui/calendario/calendario';
import { PedidoEsqueleto } from '../../components/pedido-esqueleto/pedido-esqueleto';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { Icono } from '../../../../shared/ui/icono/icono';
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
/** "Designado" cuando las prendas tienen sastres distintos (en edición): no se cambia ninguno. */
export const VARIOS = '__varios';
const UN_DIA = 86_400_000;

type FilaPrenda = FormGroup<{
  id: FormControl<string | null>;
  tipoPrendaId: FormControl<string>;
  cantidad: FormControl<number>;
  descripcion: FormControl<string>;
  precio: FormControl<string>;
  sastreId: FormControl<string>;
}>;

/**
 * Nuevo pedido y edición (solo admin), dentro del popup. Arriba el cliente (el teléfono va
 * primero: si ya es de un cliente, rellena nombre y apellido); luego una línea de captura
 * (cantidad, producto, valor unitario, detalles) que se agrega a la lista de prendas, cada
 * una editable o eliminable; abajo el calendario de entrega, el resumen (días, piezas,
 * subtotal, descuento, abono, saldo), el sastre designado y las acciones. La clave de
 * idempotencia evita duplicar el pedido al reintentar.
 */
@Component({
  selector: 'app-pedido-form',
  host: { class: 'en-modal' },
  imports: [
    ReactiveFormsModule,
    NgTemplateOutlet,
    MonedaPipe,
    Calendario,
    Icono,
    Encabezado,
    PedidoEsqueleto,
    PrendaLinea,
  ],
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
  private readonly memoria = inject(Memoria);
  private readonly router = inject(Router);
  private readonly confirmacion = inject(Confirmacion);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Vive en el popup de Pedidos. Con id edita ese pedido; sin id crea uno nuevo. */
  readonly pedidoId = input<string | null>(null);
  /** Pedido creado o edición guardada. */
  readonly guardado = output<Pedido>();
  /** Cancelado: el popup vuelve al detalle (edición) o se cierra (nuevo). */
  readonly cancelado = output<void>();
  /** ✕ del encabezado: cierra el popup (sin olvidar el borrador). */
  readonly cerrar = output<void>();

  readonly metodos = METODOS_PAGO;
  readonly varios = VARIOS;
  readonly aNumero = aNumero;
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
  /** Hay avisos del cliente que mostrar (cliente registrado, debe, cliente nuevo). */
  readonly hayAvisos = computed(
    () => !this.editando() && this.telefonoConsultado() && !this.buscandoCliente(),
  );
  readonly errorTelefono = signal<string | null>(null);

  /** Clave de la operación: se conserva al reintentar (y al recargar) para no duplicar. */
  private clave = nuevaClave();
  /** Borrador recordado (sobrevive a la recarga hasta guardar o cancelar). */
  private borrador!: FormularioRecordado<{ clave?: string; version?: number }>;

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
    /** Sastre de todas las prendas ('' sin asignar; VARIOS = cada una conserva el suyo). */
    designado: [''],
    descuento: ['', [Validators.pattern(PATRON_MONTO)]],
    abonoMonto: ['', [Validators.pattern(PATRON_MONTO)]],
    abonoMetodo: ['EFECTIVO' as MetodoPago],
  });

  /** Línea de captura: se valida al pulsar "Agregar a la lista", no al enviar el pedido. */
  readonly linea = this.fb.nonNullable.group({
    tipoPrendaId: ['', [Validators.required]],
    cantidad: [1, [Validators.required, Validators.min(1), Validators.max(999)]],
    precio: ['', [Validators.required, Validators.pattern(PATRON_MONTO), precioPositivo]],
    descripcion: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(200),
        Validators.pattern(CON_TEXTO),
      ],
    ],
  });
  /** Fila de la lista que se está editando en la línea de captura (null = agregando). */
  readonly editandoLinea = signal<number | null>(null);
  /** Se intentó enviar sin prendas. */
  readonly sinPrendas = signal(false);

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

  /** Quién hará el pedido, para la tarjeta de "Designado" (avatar con iniciales). */
  readonly designadoActual = computed(() => {
    const id = this.valores().designado;
    if (id === VARIOS) return { nombre: 'Cada prenda el suyo', iniciales: null, varios: true };
    const sastre = id ? this.sastres().find((s) => s.accesoId === id) : undefined;
    if (!sastre) return { nombre: 'Sin asignar', iniciales: null, varios: false };
    const iniciales = sastre.nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((palabra) => palabra.charAt(0).toUpperCase())
      .join('');
    return { nombre: sastre.nombre, iniciales, varios: false };
  });
  readonly abonoInvalido = computed(() => !this.editando() && this.abono() > this.total());
  /** En edición: lo ya abonado no puede quedar por encima del nuevo total. */
  /**
   * Lo que impide crear o guardar, en la línea del título (cápsula roja del encabezado): así
   * no agrega filas que cambien el alto de las tarjetas.
   */
  readonly errorAviso = computed(() => {
    if (this.totalBajoAbonado()) {
      return 'El total queda por debajo de lo abonado: primero anula abonos en el detalle del pedido.';
    }
    if (this.descuentoInvalido()) {
      return 'El descuento no puede ser mayor que el valor de las prendas.';
    }
    if (this.abonoInvalido()) {
      return 'El abono no puede superar el total.';
    }
    return this.error();
  });

  readonly totalBajoAbonado = computed(() => {
    const p = this.editando();
    return p !== null && this.total() < p.abonado;
  });
  readonly saldo = computed(() => {
    const p = this.editando();
    return Math.max(this.total() - (p ? p.abonado : this.abono()), 0);
  });
  /** Piezas: suma de cantidades. */
  readonly piezas = computed(() =>
    this.valores().prendas.reduce((suma, p) => suma + (Number(p.cantidad) || 0), 0),
  );
  /** Días desde hoy hasta la entrega (null sin fecha). */
  readonly dias = computed(() => {
    const fecha = this.valores().fechaEntrega;
    if (!fecha) {
      return null;
    }
    const [a, m, d] = fecha.split('-').map(Number);
    const [ha, hm, hd] = this.hoy.split('-').map(Number);
    return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(ha, hm - 1, hd)) / UN_DIA);
  });

  nombreTipo(id: string): string {
    return this.tipos().find((t) => t.id === id)?.nombre ?? '—';
  }

  elegirFecha(fecha: string): void {
    this.form.controls.fechaEntrega.setValue(fecha);
    this.form.controls.fechaEntrega.markAsDirty();
  }

  ngOnInit(): void {
    const id = this.pedidoId();
    this.borrador = recordarFormulario(
      this.form,
      this.memoria,
      id ? `pedido-editar:${id}` : 'pedido-nuevo',
      this.destroyRef,
      { extra: () => (id ? { version: this.editando()?.version } : { clave: this.clave }) },
    );
    this.empleados
      .asignables()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (l) => this.sastres.set(l), error: () => undefined });

    if (id) {
      this.cargarParaEditar(id);
      return;
    }
    // Mientras llega el catálogo (y se rearma el borrador guardado) se ve el skeleton.
    this.cargando.set(true);
    this.cargarTipos(new Set());
    this.form.controls.telefono.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((tel) => this.buscarCliente(tel.trim()));
    const guardado = this.borrador.leer();
    if (guardado) {
      // Al cambiar el teléfono se vuelve a buscar el cliente, como si se escribiera.
      this.restaurar(guardado.valores, new Set());
      this.clave = guardado.clave ?? this.clave;
    }
  }

  /** "Limpiar": si hay algo escrito, pide confirmar antes de borrarlo todo. */
  async limpiar(): Promise<void> {
    const algoEscrito = this.form.dirty || this.filas.length > 0 || this.linea.dirty;
    if (
      algoEscrito &&
      !(await this.confirmacion.pedir({
        titulo: '¿Limpiar el pedido?',
        mensaje: 'Se borrará todo lo que has escrito: cliente, prendas, fecha y cobro.',
        aceptar: 'Sí, limpiar',
        peligro: true,
      }))
    ) {
      return;
    }
    this.descartarBorrador();
  }

  /** Deja el formulario como recién abierto y olvida el borrador. */
  descartarBorrador(): void {
    this.borrador.olvidar();
    const p = this.editando();
    this.filas.clear();
    if (p) {
      this.llenarDesdePedido(p);
    } else {
      this.clave = nuevaClave();
      this.form.reset({ abonoMetodo: 'EFECTIVO' });
      this.usarClienteNuevo();
      this.telefonoConsultado.set(false);
    }
    this.cancelarLinea();
    this.sinPrendas.set(false);
    this.form.markAsPristine();
  }

  /** Cancelar la edición: si hay cambios sin guardar, pide confirmar antes de perderlos. */
  async cancelar(): Promise<void> {
    if (
      (this.form.dirty || this.linea.dirty) &&
      !(await this.confirmacion.pedir({
        titulo: '¿Descartar los cambios?',
        mensaje: 'Los cambios que hiciste en este pedido no se guardarán.',
        aceptar: 'Sí, descartar',
        cancelar: 'Seguir editando',
        peligro: true,
      }))
    ) {
      return;
    }
    this.borrador.olvidar();
    this.cancelado.emit();
  }

  /** "Agregar a la lista" (o "Actualizar" si se edita una fila). */
  agregarALista(): void {
    if (this.linea.invalid) {
      this.linea.markAllAsTouched();
      return;
    }
    const l = this.linea.getRawValue();
    const indice = this.editandoLinea();
    if (indice !== null) {
      this.filas.at(indice).patchValue(l);
    } else {
      const fila = this.nuevaFila();
      fila.patchValue(l);
      this.filas.push(fila);
    }
    this.sinPrendas.set(false);
    this.cancelarLinea();
    this.form.markAsDirty();
  }

  /** Pasa una fila a la línea de captura para corregirla (las entregadas no se tocan). */
  editarLinea(indice: number): void {
    if (this.esEntregada(indice)) {
      return;
    }
    const f = this.filas.at(indice).getRawValue();
    this.linea.reset({
      tipoPrendaId: f.tipoPrendaId,
      cantidad: f.cantidad,
      precio: f.precio,
      descripcion: f.descripcion,
    });
    this.editandoLinea.set(indice);
    this.llevarA('#lineaTipo');
  }

  cancelarLinea(): void {
    this.editandoLinea.set(null);
    this.linea.reset({ tipoPrendaId: '', cantidad: 1, precio: '', descripcion: '' });
  }

  quitarPrenda(indice: number): void {
    if (this.esEntregada(indice)) {
      return;
    }
    this.filas.removeAt(indice);
    this.form.markAsDirty();
    const editando = this.editandoLinea();
    if (editando === indice) {
      this.cancelarLinea();
    } else if (editando !== null && editando > indice) {
      this.editandoLinea.set(editando - 1);
    }
  }

  /** Alguna prenda quedaría sin sastre (designado vacío, o "varios" con prendas sin asignar). */
  private faltaAsignar(): boolean {
    const v = this.form.getRawValue();
    if (v.designado !== VARIOS) {
      return !v.designado;
    }
    return v.prendas.some((p) => !p.sastreId);
  }

  /** Al elegir el producto se precarga el precio sugerido (si el precio está vacío). */
  alCambiarTipo(): void {
    const fila = this.linea;
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

  /**
   * Crea (o guarda) el pedido; con `imprimir`, al crearlo abre el ticket para imprimir. Al crear
   * sin nadie asignado (quien crea puede asignar), pide confirmar antes (dueño 2026-10-20).
   */
  async enviar(imprimir = false): Promise<void> {
    this.sinPrendas.set(this.filas.length === 0);
    if (
      this.filas.length === 0 ||
      this.form.invalid ||
      this.descuentoInvalido() ||
      this.abonoInvalido() ||
      this.totalBajoAbonado()
    ) {
      this.form.markAllAsTouched();
      this.avisarFaltantes();
      return;
    }
    if (this.guardando()) {
      return;
    }
    if (!this.editando() && this.puedeAsignar() && this.faltaAsignar()) {
      const crear = await this.confirmacion.pedir({
        titulo: '¿Crear el pedido sin asignar?',
        mensaje:
          'Este pedido tiene prendas sin una persona asignada para hacerlas. Puedes crearlo así y asignarlas después desde el detalle del pedido.',
        aceptar: 'Sí, crearlo así',
        cancelar: 'Asignar ahora',
      });
      if (!crear || this.guardando()) {
        return;
      }
    }
    this.guardando.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    const prendas: PrendaRequest[] = v.prendas.map((p) => ({
      id: p.id,
      tipoPrendaId: p.tipoPrendaId,
      sastreId: (v.designado === VARIOS ? p.sastreId : v.designado) || null,
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
        this.borrador.olvidar();
        this.clave = nuevaClave();
        if (imprimir) {
          this.router.navigate(['/ticket', pedido.id], { queryParams: { imprimir: 1 } });
        }
        this.guardado.emit(pedido);
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

  /**
   * Qué falta para crear o guardar (dueño 2026-10-20): se avisa en un popup que hay que aceptar
   * y, si el formulario se desplaza (teléfono), se lleva al primer dato que falta.
   */
  private avisarFaltantes(): void {
    const c = this.form.controls;
    const faltan: { texto: string; selector: string }[] = [];
    if (c.telefono.invalid) {
      faltan.push({ texto: 'el teléfono del cliente', selector: '#telefono' });
    }
    if (c.nombre.invalid || c.apellido.invalid) {
      faltan.push({ texto: 'el nombre y el apellido', selector: '#nombre' });
    }
    if (this.filas.length === 0) {
      faltan.push({ texto: 'al menos una prenda en la lista', selector: '#lineaTipo' });
    }
    if (c.fechaEntrega.invalid) {
      faltan.push({ texto: 'la fecha de entrega', selector: 'app-calendario' });
    }
    if (faltan.length > 0) {
      const lista = faltan.map((f) => f.texto);
      const texto =
        lista.length === 1 ? lista[0] : lista.slice(0, -1).join(', ') + ' y ' + lista.at(-1);
      const que = this.editando() ? 'guardar' : 'crear';
      this.avisar('Falta información', `Para ${que} el pedido falta ${texto}.`, faltan[0].selector);
      return;
    }
    // Lo demás (descuento, abono, total) ya se explica en la línea del título.
    const motivo = this.errorAviso();
    if (motivo) {
      this.avisar('Revisa el pedido', motivo, '.pf-cobro');
    }
  }

  /**
   * Aviso en el centro de la pantalla que hay que aceptar (dueño 2026-10-20: no una
   * notificación); al aceptarlo, si el popup se desplaza, lleva al dato que falta.
   */
  private avisar(titulo: string, mensaje: string, selector: string): void {
    void this.confirmacion.avisar({ titulo, mensaje }).then(() => this.llevarA(selector));
  }

  /**
   * Solo cuando el popup se desplaza (teléfono o pantallas bajas): lleva lo indicado a la mitad
   * de la pantalla, para ahorrarle el desplazamiento a la persona (dueño 2026-10-20).
   */
  private llevarA(selector: string): void {
    const destino = this.host.nativeElement.querySelector<HTMLElement>(selector);
    const caja = this.host.nativeElement.closest<HTMLElement>('[role="dialog"]');
    if (!destino || !caja || caja.scrollHeight <= caja.clientHeight) {
      return;
    }
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const objetivo = destino.closest<HTMLElement>('.pf-seccion') ?? destino;
    objetivo.scrollIntoView({ block: 'center', behavior: suave ? 'smooth' : 'auto' });
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
          const guardado = this.borrador.leer();
          if (guardado && guardado.version === p.version) {
            // Edición a medias de antes de recargar (sobre la misma versión del pedido).
            this.form.patchValue({
              telefono: p.cliente.telefono,
              nombre: p.cliente.nombre,
              apellido: p.cliente.apellido,
            });
            this.restaurar(
              guardado.valores,
              new Set(p.prendas.filter((pr) => pr.estado === 'ENTREGADO').map((pr) => pr.id)),
            );
          } else {
            if (guardado) {
              // Otra persona cambió el pedido desde entonces: el borrador ya no aplica.
              this.borrador.olvidar();
            }
            this.llenarDesdePedido(p);
          }
          this.cargarTipos(new Set(p.prendas.map((pr) => pr.tipoPrendaId)));
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo cargar el pedido.'));
        },
      });
  }

  private llenarDesdePedido(p: Pedido): void {
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
    const sastres = new Set(p.prendas.map((pr) => pr.sastreId ?? ''));
    this.form.controls.designado.setValue(sastres.size === 1 ? [...sastres][0] : VARIOS);
  }

  /** Vuelve a poner un borrador (las filas de prendas se reconstruyen una a una). */
  private restaurar(valores: Record<string, unknown>, entregadas: Set<string>): void {
    const { prendas, telefono, nombre, apellido, ...resto } = valores as ReturnType<
      typeof this.form.getRawValue
    >;
    if (!this.editando()) {
      this.form.patchValue({ telefono, nombre, apellido });
    }
    this.form.patchValue(resto);
    this.filas.clear();
    for (const pr of prendas ?? []) {
      const fila = this.nuevaFila();
      fila.patchValue(pr);
      if (pr.id && entregadas.has(pr.id)) {
        fila.disable();
      }
      this.filas.push(fila);
    }
    this.form.markAsDirty();
  }

  /** Tipos activos, más los ya usados en el pedido aunque se hayan desactivado. */
  private cargarTipos(usados: Set<string>): void {
    this.tiposService
      .listar(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => {
          this.tipos.set(lista.filter((t) => t.activo || usados.has(t.id)));
          this.terminarCargaNuevo();
        },
        error: (err: unknown) => {
          this.error.set(mensajeDeError(err, 'No se pudo cargar el catálogo de prendas.'));
          this.terminarCargaNuevo();
        },
      });
  }

  /** Pedido nuevo: con el catálogo listo, se muestra el formulario (en edición lo hace la carga del pedido). */
  private terminarCargaNuevo(): void {
    if (!this.pedidoId()) {
      this.cargando.set(false);
    }
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
