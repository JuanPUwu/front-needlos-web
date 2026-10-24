import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { PermisosService } from '../../../../core/auth/permisos';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Confirmacion, EstadoConColor } from '../../../../core/ui/confirmacion';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { FechaPipe } from '../../../../shared/pipes/fecha.pipe';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { Calendario } from '../../../../shared/ui/calendario/calendario';
import { PedidoEsqueleto } from '../../components/pedido-esqueleto/pedido-esqueleto';
import { PrendaTarjeta } from '../../components/prenda-tarjeta/prenda-tarjeta';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { Icono } from '../../../../shared/ui/icono/icono';
import { hoyIso, nuevaClave } from '../../../../shared/util/fechas';
import { aNumero, aTexto } from '../../../../shared/util/montos';
import { MiembroAsignable } from '../../../equipo/models/empleado.model';
import { EmpleadoService } from '../../../equipo/services/empleado.service';
import {
  Abono,
  ETIQUETA_ESTADO,
  ETIQUETA_ESTADO_PRENDA,
  METODOS_PAGO,
  MetodoPago,
  MotivoAnulacionAbono,
  Pedido,
  Prenda,
  etiquetaMetodo,
} from '../../models/pedido.model';
import { PedidoService } from '../../services/pedido.service';
import { Vacio } from '../../../../shared/ui/vacio/vacio';
import { ERROR_MONTO, montoCop } from '../../../../shared/validators/monto.validators';

const CON_TEXTO = /\S/;
const UN_DIA = 24 * 60 * 60 * 1000;

/** Estados de la prenda con su color, para confirmar los cambios. */
const EN_PROCESO: EstadoConColor = { texto: 'En proceso', tono: 'proceso' };
const FINALIZADO: EstadoConColor = { texto: 'Finalizado', tono: 'finalizado' };
const ENTREGADO: EstadoConColor = { texto: 'Entregado', tono: 'entregado' };

/**
 * Detalle de un pedido (se muestra dentro del popup de Pedidos): prendas con su estado e
 * historial, cambio de estado y de sastre (según permisos), entrega (avisa si queda saldo),
 * abonos (registrar y, el admin, anular con motivo), editar y anular (solo admin) y ticket.
 * Avisa cada cambio con `cambio` para que el listado se actualice. Misma distribución que el
 * formulario de crear/editar (Reglas §12.3): cliente, abonos y entrega a la izquierda;
 * prendas, cobro y acciones a la derecha, para que todo esté en el mismo lugar.
 */
@Component({
  selector: 'app-pedido-detalle',
  imports: [
    Vacio,
    ReactiveFormsModule,
    NgTemplateOutlet,
    RouterLink,
    FechaPipe,
    FechaHoraPipe,
    MonedaPipe,
    PedidoEsqueleto,
    PrendaTarjeta,
    Calendario,
    Encabezado,
    Icono,
  ],
  templateUrl: './pedido-detalle.html',
  styleUrl: './pedido-detalle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoDetalle implements OnInit {
  readonly errorMonto = ERROR_MONTO;
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PedidoService);
  private readonly empleados = inject(EmpleadoService);
  private readonly permisos = inject(PermisosService);
  private readonly confirmacion = inject(Confirmacion);
  private readonly notificaciones = inject(Notificaciones);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly pedidoId = input.required<string>();
  /** El pedido cambió (estado, abono, anulación): el listado debe recargarse. */
  readonly cambio = output<Pedido>();
  /** Pide pasar a la edición (la hace el popup). */
  readonly editar = output<void>();
  /** Ver todos los pedidos de este cliente. */
  readonly verCliente = output<{ id: string; nombre: string }>();
  /** ✕ del encabezado: cierra el popup. */
  readonly cerrar = output<void>();

  readonly etiquetaEstado = ETIQUETA_ESTADO;
  readonly etiquetaPrenda = ETIQUETA_ESTADO_PRENDA;
  readonly metodos = METODOS_PAGO;
  readonly etiquetaMetodo = etiquetaMetodo;

  readonly pedido = signal<Pedido | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  /** Acción en curso (id de prenda/abono o nombre de la acción). */
  readonly ocupado = signal<string | null>(null);
  readonly sastres = signal<MiembroAsignable[]>([]);

  readonly anulando = signal(false);
  readonly anulandoAbono = signal<string | null>(null);
  /** Qué muestra la lista de la derecha (donde el formulario tiene las prendas). */
  readonly vista = signal<'prendas' | 'abonos'>('prendas');

  private claveAbono = nuevaClave();

  readonly esAdmin = computed(() => this.permisos.admin());
  readonly puedeCambiarEstado = computed(() => this.permisos.puede('CAMBIAR_ESTADO_PRENDAS'));
  readonly puedeEntregar = computed(() => this.permisos.puede('ENTREGAR_PRENDAS'));
  readonly puedeAsignar = computed(() => this.permisos.puede('ASIGNAR_SASTRE'));
  readonly puedeCobrar = computed(() => this.permisos.puede('REGISTRAR_ABONOS'));

  readonly anulado = computed(() => this.pedido()?.estado === 'ANULADO');
  /** Abonos vigentes (no anulados) y el último registrado, para la tarjeta de abonos. */
  readonly cantidadAbonos = computed(
    () => this.pedido()?.abonos.filter((a) => !a.anulado).length ?? 0,
  );
  readonly ultimoAbono = computed(() =>
    (this.pedido()?.abonos ?? [])
      .filter((a) => !a.anulado)
      .reduce<Abono | null>((ultimo, a) => (!ultimo || a.fecha > ultimo.fecha ? a : ultimo), null),
  );
  /** Se puede registrar un abono (permiso, pedido vigente y con saldo). */
  readonly puedeAbonar = computed(() => {
    const p = this.pedido();
    return this.puedeCobrar() && !!p && p.estado !== 'ANULADO' && p.saldo > 0;
  });

  /** Tarjeta "Designado" (como en el formulario): avatar de quien hace el pedido. */
  readonly designado = computed(() => {
    const prendas = this.pedido()?.prendas ?? [];
    const ids = new Set(prendas.map((p) => p.sastreId ?? ''));
    if (ids.size > 1) {
      return { nombre: 'Cada prenda el suyo', iniciales: null, varios: true };
    }
    const nombre = prendas[0]?.sastre;
    if (!nombre) {
      return { nombre: 'Sin asignar', iniciales: null, varios: false };
    }
    const iniciales = nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((palabra) => palabra.charAt(0).toUpperCase())
      .join('');
    return { nombre, iniciales, varios: false };
  });

  /** Piezas del pedido (suma de cantidades), como en el formulario. */
  readonly piezas = computed(
    () => this.pedido()?.prendas.reduce((suma, p) => suma + p.cantidad, 0) ?? 0,
  );
  /** Días que faltan para la entrega (negativo si ya pasó). */
  readonly dias = computed(() => {
    const fecha = this.pedido()?.fechaEntrega;
    if (!fecha) {
      return null;
    }
    const [a, m, d] = fecha.split('-').map(Number);
    const [ha, hm, hd] = hoyIso().split('-').map(Number);
    return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(ha, hm - 1, hd)) / UN_DIA);
  });
  readonly finalizadas = computed(
    () => this.pedido()?.prendas.filter((p) => p.estado === 'FINALIZADO') ?? [],
  );
  readonly enProceso = computed(
    () => this.pedido()?.prendas.filter((p) => p.estado === 'EN_PROCESO') ?? [],
  );
  readonly abonosVigentes = computed(
    () => this.pedido()?.abonos.filter((a) => !a.anulado).length ?? 0,
  );

  readonly formAbono = this.fb.nonNullable.group({
    monto: ['', [Validators.required, montoCop]],
    metodo: ['EFECTIVO' as MetodoPago, [Validators.required]],
  });

  readonly formAnular = this.fb.nonNullable.group({
    razon: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(300),
        Validators.pattern(CON_TEXTO),
      ],
    ],
  });

  readonly formAnularAbono = this.fb.nonNullable.group({
    motivo: ['DEVOLUCION' as MotivoAnulacionAbono, [Validators.required]],
    razon: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(300),
        Validators.pattern(CON_TEXTO),
      ],
    ],
  });

  constructor() {
    // Sin permiso, anulado o sin saldo, la tarjeta de abonos se ve igual pero deshabilitada.
    effect(() => {
      if (this.puedeAbonar()) {
        this.formAbono.enable({ emitEvent: false });
      } else {
        this.formAbono.disable({ emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    const id = this.pedidoId();
    this.empleados
      .asignables()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (l) => this.sastres.set(l), error: () => undefined });
    this.service
      .obtener(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.pedido.set(p);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo cargar el pedido.'));
        },
      });
  }

  // ── Prendas ─────────────────────────────────────────────────

  /**
   * Todo cambio de estado se confirma mostrando "actual → nuevo" con sus colores (dueño
   * 2026-10-23): un clic de más no cambia nada sin querer.
   */
  async finalizar(prenda: Prenda): Promise<void> {
    const ok = await this.confirmacion.pedir({
      titulo: '¿Pasar la prenda a Finalizado?',
      mensaje: `${prenda.tipoPrenda} quedará lista para entregar.`,
      aceptar: 'Sí, finalizar',
      cambio: { desde: EN_PROCESO, hacia: FINALIZADO },
    });
    if (ok) {
      this.ejecutar(prenda.id, (p) => this.service.cambiarEstado(p.id, prenda.id, 'FINALIZADO'));
    }
  }

  async volverAProceso(prenda: Prenda): Promise<void> {
    const ok = await this.confirmacion.pedir({
      titulo: '¿Devolver la prenda a En proceso?',
      mensaje: `${prenda.tipoPrenda} volverá a estar en trabajo.`,
      aceptar: 'Sí, devolver',
      cambio: { desde: FINALIZADO, hacia: EN_PROCESO },
    });
    if (ok) {
      this.ejecutar(prenda.id, (p) => this.service.cambiarEstado(p.id, prenda.id, 'EN_PROCESO'));
    }
  }

  /**
   * Entregar no tiene vuelta atrás: siempre se confirma, y si queda saldo se avisa en la
   * misma confirmación (cada sastrería decide si entrega sin pago completo).
   */
  async entregar(prendaIds: string[]): Promise<void> {
    const p = this.pedido();
    if (!p || prendaIds.length === 0) {
      return;
    }
    const varias = prendaIds.length > 1;
    const saldo = p.saldo > 0 ? ` Queda un saldo pendiente de ${formatoPesos(p.saldo)}.` : '';
    const ok = await this.confirmacion.pedir({
      titulo: varias ? `¿Entregar ${prendaIds.length} prendas?` : '¿Entregar la prenda?',
      mensaje: `Una prenda entregada ya no se puede volver a cambiar.${saldo}`,
      aceptar: p.saldo > 0 ? 'Entregar de todos modos' : 'Sí, entregar',
      peligro: p.saldo > 0,
      cambio: { desde: FINALIZADO, hacia: ENTREGADO },
    });
    if (!ok) {
      return;
    }
    this.ejecutar(
      'entregar',
      (actual) => this.service.entregar(actual.id, prendaIds),
      () =>
        this.notificaciones.exito(
          `${varias ? `${prendaIds.length} prendas entregadas` : 'Prenda entregada'} del pedido ${p.numero}.`,
        ),
    );
  }

  /** Pasa a Finalizado todas las prendas en proceso, con la misma confirmación (dueño 2026-10-23). */
  async finalizarTodas(): Promise<void> {
    const p = this.pedido();
    const ids = this.enProceso().map((pr) => pr.id);
    if (!p || ids.length === 0) {
      return;
    }
    const ok = await this.confirmacion.pedir({
      titulo: `¿Pasar las ${ids.length} prendas en proceso a Finalizado?`,
      mensaje: 'Todas quedarán listas para entregar.',
      aceptar: 'Sí, finalizar todas',
      cambio: { desde: EN_PROCESO, hacia: FINALIZADO },
    });
    if (!ok) {
      return;
    }
    this.ejecutar(
      'finalizar-todas',
      (actual) => this.service.cambiarEstadoVarias(actual.id, ids, 'FINALIZADO'),
      () => this.notificaciones.exito(`${ids.length} prendas finalizadas del pedido ${p.numero}.`),
    );
  }

  entregarFinalizadas(): void {
    this.entregar(this.finalizadas().map((p) => p.id));
  }

  asignarSastre(prenda: Prenda, sastreId: string): void {
    this.ejecutar(prenda.id, (p) => this.service.asignarSastre(p.id, prenda.id, sastreId || null));
  }

  // ── Abonos ──────────────────────────────────────────────────

  pagarSaldo(): void {
    this.formAbono.controls.monto.setValue(aTexto(this.pedido()?.saldo ?? 0));
  }

  registrarAbono(): void {
    const p = this.pedido();
    const monto = aNumero(this.formAbono.controls.monto.value);
    if (!p || this.formAbono.invalid || monto === null || monto <= 0) {
      this.formAbono.markAllAsTouched();
      // Qué falta, con un aviso que hay que aceptar, como en el formulario (dueño 2026-10-20).
      if (this.formAbono.controls.monto.hasError('required')) {
        this.avisar('Falta información', 'Para registrar el abono falta el monto.', '#monto');
      } else {
        this.avisar('Monto no válido', 'El monto del abono no es válido.', '#monto');
      }
      return;
    }
    if (monto > p.saldo) {
      const motivo = 'El abono no puede superar el saldo pendiente.';
      this.error.set(motivo);
      this.avisar('Monto mayor que el saldo', motivo, '#monto');
      return;
    }
    const metodo = this.formAbono.controls.metodo.value;
    this.ejecutar(
      'abono',
      (actual) => this.service.registrarAbono(actual.id, { monto, metodo }, this.claveAbono),
      () => {
        this.claveAbono = nuevaClave();
        this.formAbono.reset({ monto: '', metodo });
        this.notificaciones.exito(
          `Abono de ${formatoPesos(monto)} registrado en el pedido ${p.numero}.`,
        );
      },
    );
  }

  pedirAnularAbono(abono: Abono): void {
    this.anulandoAbono.set(abono.id);
    this.formAnularAbono.reset({ motivo: 'DEVOLUCION', razon: '' });
    this.llevarA('.pd-anular-abono', true);
  }

  cancelarAnularAbono(): void {
    this.anulandoAbono.set(null);
  }

  anularAbono(abono: Abono): void {
    if (this.formAnularAbono.invalid) {
      this.formAnularAbono.markAllAsTouched();
      this.avisar('Falta información', 'Para anular el abono falta la razón.', '.pd-anular-abono');
      return;
    }
    const { motivo, razon } = this.formAnularAbono.getRawValue();
    this.ejecutar(
      abono.id,
      () => this.service.anularAbono(abono.id, motivo, razon.trim()),
      () => {
        this.anulandoAbono.set(null);
        const numero = this.pedido()?.numero ?? '';
        this.notificaciones.exito(
          motivo === 'DEVOLUCION'
            ? `Devolución de ${formatoPesos(abono.monto)} registrada en el pedido ${numero}.`
            : `Abono de ${formatoPesos(abono.monto)} anulado en el pedido ${numero}.`,
        );
      },
    );
  }

  // ── Anular el pedido ────────────────────────────────────────

  pedirAnular(): void {
    this.anulando.set(true);
    this.formAnular.reset();
    this.llevarA('.pd-confirmar', true);
  }

  cancelarAnular(): void {
    this.anulando.set(false);
  }

  anular(): void {
    if (this.formAnular.invalid) {
      this.formAnular.markAllAsTouched();
      this.avisar('Falta información', 'Para anular el pedido falta la razón.', '.pd-confirmar');
      return;
    }
    const razon = this.formAnular.controls.razon.value.trim();
    this.ejecutar(
      'anular',
      (p) => this.service.anular(p.id, razon),
      () => {
        this.anulando.set(false);
        this.notificaciones.exito(`Pedido ${this.pedido()?.numero ?? ''} anulado.`);
      },
    );
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
   * de la pantalla, para ahorrarle el desplazamiento a la persona (dueño 2026-10-20). Con
   * `trasMostrar`, espera a que el bloque recién abierto aparezca.
   */
  private llevarA(selector: string, trasMostrar = false): void {
    const ir = () => {
      const destino = this.host.nativeElement.querySelector<HTMLElement>(selector);
      const caja = this.host.nativeElement.closest<HTMLElement>('[role="dialog"]');
      if (!destino || !caja || caja.scrollHeight <= caja.clientHeight) {
        return;
      }
      const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const objetivo = destino.closest<HTMLElement>('.pd-seccion') ?? destino;
      objetivo.scrollIntoView({ block: 'center', behavior: suave ? 'smooth' : 'auto' });
    };
    if (trasMostrar) {
      afterNextRender(ir, { injector: this.injector });
    } else {
      ir();
    }
  }

  private ejecutar(
    clave: string,
    accion: (p: Pedido) => Observable<Pedido>,
    alTerminar?: () => void,
  ): void {
    const p = this.pedido();
    if (!p || this.ocupado()) {
      return;
    }
    this.ocupado.set(clave);
    this.error.set(null);
    accion(p)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizado) => {
          this.ocupado.set(null);
          this.pedido.set(actualizado);
          this.cambio.emit(actualizado);
          alTerminar?.();
        },
        error: (err: unknown) => {
          this.ocupado.set(null);
          this.error.set(mensajeDeError(err, 'No se pudo completar la acción.'));
        },
      });
  }
}

/** "$ 27.000" para el texto de la confirmación. */
function formatoPesos(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: Number.isInteger(valor) ? 0 : 2,
  }).format(valor);
}
