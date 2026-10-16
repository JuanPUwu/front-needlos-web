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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { PermisosService } from '../../../../core/auth/permisos';
import { mensajeDeError } from '../../../../core/http/api-error';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { FechaPipe } from '../../../../shared/pipes/fecha.pipe';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { nuevaClave } from '../../../../shared/util/fechas';
import { PATRON_MONTO, aNumero, aTexto } from '../../../../shared/util/montos';
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

const CON_TEXTO = /\S/;

/**
 * Detalle de un pedido: prendas con su estado e historial, cambio de estado y de sastre
 * (según permisos), entrega (avisa si queda saldo), abonos (registrar y, el admin, anular
 * con motivo), editar y anular el pedido (solo admin) y el ticket.
 */
@Component({
  selector: 'app-pedido-detalle',
  imports: [ReactiveFormsModule, RouterLink, FechaPipe, FechaHoraPipe, MonedaPipe],
  templateUrl: './pedido-detalle.html',
  styleUrl: './pedido-detalle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoDetalle implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PedidoService);
  private readonly empleados = inject(EmpleadoService);
  private readonly permisos = inject(PermisosService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly etiquetaEstado = ETIQUETA_ESTADO;
  readonly etiquetaPrenda = ETIQUETA_ESTADO_PRENDA;
  readonly metodos = METODOS_PAGO;
  readonly etiquetaMetodo = etiquetaMetodo;

  readonly pedido = signal<Pedido | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly exito = signal<string | null>(null);
  /** Acción en curso (id de prenda/abono o nombre de la acción). */
  readonly ocupado = signal<string | null>(null);
  readonly sastres = signal<MiembroAsignable[]>([]);

  /** Prendas a entregar pendientes de confirmar porque queda saldo. */
  readonly confirmarEntrega = signal<string[] | null>(null);
  readonly anulando = signal(false);
  readonly anulandoAbono = signal<string | null>(null);
  readonly historialAbierto = signal<Set<string>>(new Set());

  private claveAbono = nuevaClave();

  readonly esAdmin = computed(() => this.permisos.admin());
  readonly puedeCambiarEstado = computed(() => this.permisos.puede('CAMBIAR_ESTADO_PRENDAS'));
  readonly puedeEntregar = computed(() => this.permisos.puede('ENTREGAR_PRENDAS'));
  readonly puedeAsignar = computed(() => this.permisos.puede('ASIGNAR_SASTRE'));
  readonly puedeCobrar = computed(() => this.permisos.puede('REGISTRAR_ABONOS'));

  readonly anulado = computed(() => this.pedido()?.estado === 'ANULADO');
  readonly finalizadas = computed(
    () => this.pedido()?.prendas.filter((p) => p.estado === 'FINALIZADO') ?? [],
  );
  readonly abonosVigentes = computed(
    () => this.pedido()?.abonos.filter((a) => !a.anulado).length ?? 0,
  );

  readonly formAbono = this.fb.nonNullable.group({
    monto: ['', [Validators.required, Validators.pattern(PATRON_MONTO)]],
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

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
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

  finalizar(prenda: Prenda): void {
    this.ejecutar(prenda.id, (p) => this.service.cambiarEstado(p.id, prenda.id, 'FINALIZADO'));
  }

  volverAProceso(prenda: Prenda): void {
    this.ejecutar(prenda.id, (p) => this.service.cambiarEstado(p.id, prenda.id, 'EN_PROCESO'));
  }

  /** Entrega; si queda saldo, primero pide confirmar (cada sastrería decide). */
  entregar(prendaIds: string[]): void {
    const p = this.pedido();
    if (!p || prendaIds.length === 0) {
      return;
    }
    if (p.saldo > 0 && this.confirmarEntrega() === null) {
      this.confirmarEntrega.set(prendaIds);
      return;
    }
    this.confirmarEntrega.set(null);
    this.ejecutar(
      'entregar',
      (actual) => this.service.entregar(actual.id, prendaIds),
      () => this.exito.set(prendaIds.length === 1 ? 'Prenda entregada.' : 'Prendas entregadas.'),
    );
  }

  entregarFinalizadas(): void {
    this.entregar(this.finalizadas().map((p) => p.id));
  }

  cancelarEntrega(): void {
    this.confirmarEntrega.set(null);
  }

  asignarSastre(prenda: Prenda, sastreId: string): void {
    this.ejecutar(prenda.id, (p) => this.service.asignarSastre(p.id, prenda.id, sastreId || null));
  }

  alternarHistorial(prendaId: string): void {
    this.historialAbierto.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(prendaId)) {
        nuevo.delete(prendaId);
      } else {
        nuevo.add(prendaId);
      }
      return nuevo;
    });
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
      return;
    }
    if (monto > p.saldo) {
      this.error.set('El abono no puede superar el saldo pendiente.');
      return;
    }
    const metodo = this.formAbono.controls.metodo.value;
    this.ejecutar(
      'abono',
      (actual) => this.service.registrarAbono(actual.id, { monto, metodo }, this.claveAbono),
      () => {
        this.claveAbono = nuevaClave();
        this.formAbono.reset({ monto: '', metodo });
        this.exito.set('Abono registrado.');
      },
    );
  }

  pedirAnularAbono(abono: Abono): void {
    this.anulandoAbono.set(abono.id);
    this.formAnularAbono.reset({ motivo: 'DEVOLUCION', razon: '' });
  }

  cancelarAnularAbono(): void {
    this.anulandoAbono.set(null);
  }

  anularAbono(abono: Abono): void {
    if (this.formAnularAbono.invalid) {
      this.formAnularAbono.markAllAsTouched();
      return;
    }
    const { motivo, razon } = this.formAnularAbono.getRawValue();
    this.ejecutar(
      abono.id,
      () => this.service.anularAbono(abono.id, motivo, razon.trim()),
      () => {
        this.anulandoAbono.set(null);
        this.exito.set(motivo === 'DEVOLUCION' ? 'Devolución registrada.' : 'Abono anulado.');
      },
    );
  }

  // ── Anular el pedido ────────────────────────────────────────

  pedirAnular(): void {
    this.anulando.set(true);
    this.formAnular.reset();
  }

  cancelarAnular(): void {
    this.anulando.set(false);
  }

  anular(): void {
    if (this.formAnular.invalid) {
      this.formAnular.markAllAsTouched();
      return;
    }
    const razon = this.formAnular.controls.razon.value.trim();
    this.ejecutar(
      'anular',
      (p) => this.service.anular(p.id, razon),
      () => {
        this.anulando.set(false);
        this.exito.set('Pedido anulado.');
      },
    );
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
    this.exito.set(null);
    accion(p)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizado) => {
          this.ocupado.set(null);
          this.pedido.set(actualizado);
          alTerminar?.();
        },
        error: (err: unknown) => {
          this.ocupado.set(null);
          this.error.set(mensajeDeError(err, 'No se pudo completar la acción.'));
        },
      });
  }
}
