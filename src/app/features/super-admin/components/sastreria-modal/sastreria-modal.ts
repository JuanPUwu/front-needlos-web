import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/auth/auth.service';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { Icono } from '../../../../shared/ui/icono/icono';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import {
  AccionPlataforma,
  ETIQUETA_ACCION_SUPERADMIN,
  ETIQUETA_ESTADO_PLATAFORMA,
  MESES_LICENCIA,
  SastreriaPlataforma,
} from '../../models/plataforma.model';
import { PlataformaService } from '../../services/plataforma.service';
import { Vacio } from '../../../../shared/ui/vacio/vacio';

/** Mientras carga: el mismo marcado con datos de ejemplo en piezas grises (mide igual). */
const ESQUELETO: SastreriaPlataforma = {
  id: '',
  nombre: 'Sastrería',
  plan: 'DEMO',
  vence: '2026-01-01T05:00:00Z',
  estado: 'PRUEBA',
  activo: true,
  registro: '2026-01-01T05:00:00Z',
  ultimoAcceso: '2026-01-01T05:00:00Z',
  pedidos: 0,
  personas: 0,
  admin: 'Nombre del admin',
  adminEmail: 'correo@ejemplo.com',
  telefono: '3000000000',
  bloqueoMotivo: null,
  eliminacionSolicitadaEn: null,
  seBorraEl: null,
  eliminacionOrigen: null,
  eliminadaEn: null,
};

/** Qué cambió, para que el panel actualice el listado y avise. */
export interface CambioSastreria {
  sastreria: SastreriaPlataforma;
  mensaje: string;
}

/**
 * Popup de una sastrería para el SuperAdmin (Manual §16): su uso (sin montos), otorgar o extender
 * la licencia por meses, bloquear por abuso o recuperar (con confirmación) y su registro de acciones.
 */
@Component({
  selector: 'app-sastreria-modal',
  imports: [Vacio, Encabezado, Icono, TituloBloque, FechaHoraPipe],
  templateUrl: './sastreria-modal.html',
  styleUrl: './sastreria-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cerrado.emit()' },
})
export class SastreriaModal implements OnInit, OnDestroy {
  private readonly service = inject(PlataformaService);
  private readonly confirmacion = inject(Confirmacion);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly sastreriaId = input.required<string>();
  readonly cambiado = output<CambioSastreria>();
  readonly cerrado = output<void>();

  readonly meses = MESES_LICENCIA;
  readonly etiquetaEstado = ETIQUETA_ESTADO_PLATAFORMA;
  readonly etiquetaAccion = ETIQUETA_ACCION_SUPERADMIN;

  readonly sastreria = signal<SastreriaPlataforma | null>(null);
  readonly acciones = signal<AccionPlataforma[] | null>(null);
  readonly ocupado = signal(false);
  /** Pidiendo el motivo del bloqueo por abuso. */
  readonly bloqueando = signal(false);
  readonly motivo = signal('');
  readonly error = signal<string | null>(null);

  /** Lo que se pinta: los datos o, mientras llegan, el esqueleto. */
  readonly vista = computed(() => this.sastreria() ?? (this.error() ? null : ESQUELETO));

  private readonly caja = viewChild.required<ElementRef<HTMLElement>>('caja');
  private readonly focoPrevio = document.activeElement as HTMLElement | null;

  constructor() {
    afterNextRender(() => this.caja().nativeElement.focus());
  }

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.focoPrevio?.focus?.();
  }

  /** Hasta cuándo quedaría con `meses` más (se suma si sigue vigente; si no, desde hoy). */
  quedariaHasta(meses: number): Date {
    const s = this.sastreria();
    const ahora = new Date();
    const vence = s?.plan === 'LICENCIADO' && s.vence ? new Date(s.vence) : null;
    const desde = vence && vence > ahora ? vence : ahora;
    const hasta = new Date(desde);
    hasta.setMonth(hasta.getMonth() + meses);
    return hasta;
  }

  async otorgar(meses: number): Promise<void> {
    const s = this.sastreria();
    if (!s || this.ocupado()) {
      return;
    }
    const hasta = this.quedariaHasta(meses).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const ok = await this.confirmacion.pedir({
      titulo: `¿Otorgar ${meses} ${meses === 1 ? 'mes' : 'meses'} a ${s.nombre}?`,
      mensaje: `Quedará licenciada hasta el ${hasta}. Si estaba sin plan, vuelve a funcionar completa.`,
      aceptar: 'Sí, otorgar',
    });
    if (ok) {
      this.ejecutar(
        this.service.otorgarLicencia(s.id, meses),
        `Licencia de ${meses} ${meses === 1 ? 'mes' : 'meses'} otorgada a ${s.nombre}.`,
      );
    }
  }

  /** Primer toque: pide el motivo; segundo: confirma y bloquea (Manual §16.1). */
  async bloquear(): Promise<void> {
    const s = this.sastreria();
    if (!s || this.ocupado()) {
      return;
    }
    if (!this.bloqueando()) {
      this.motivo.set('');
      this.bloqueando.set(true);
      return;
    }
    const motivo = this.motivo().trim();
    const ok = await this.confirmacion.pedir({
      titulo: `¿Bloquear ${s.nombre}?`,
      mensaje:
        'Nadie de la sastrería podrá entrar y se cerrarán sus sesiones abiertas. Es solo para abuso; sus datos se conservan y puedes quitar el bloqueo.',
      aceptar: 'Sí, bloquear',
      peligro: true,
    });
    if (ok) {
      this.bloqueando.set(false);
      this.ejecutar(this.service.bloquear(s.id, motivo), `${s.nombre} bloqueada por abuso.`);
    }
  }

  desbloquear(): void {
    const s = this.sastreria();
    if (s && !this.ocupado()) {
      this.ejecutar(this.service.desbloquear(s.id), `Bloqueo de ${s.nombre} quitado.`);
    }
  }

  async recuperar(): Promise<void> {
    const s = this.sastreria();
    if (!s || this.ocupado()) {
      return;
    }
    const ok = await this.confirmacion.pedir({
      titulo: `¿Recuperar ${s.nombre}?`,
      mensaje: 'Su equipo podrá volver a entrar y no se borrará. Hazlo solo si su dueño lo pidió.',
      aceptar: 'Sí, recuperar',
    });
    if (ok) {
      this.ejecutar(this.service.recuperar(s.id), `${s.nombre} recuperada.`);
    }
  }

  /** Entra a la sastrería como su admin, en solo lectura; el admin verá el aviso de la visita. */
  async entrarEnSoporte(): Promise<void> {
    const s = this.sastreria();
    if (!s || this.ocupado()) {
      return;
    }
    const ok = await this.confirmacion.pedir({
      titulo: `¿Entrar a ${s.nombre} en modo soporte?`,
      mensaje:
        'Verás la sastrería como su admin, sin poder cambiar nada. La visita queda registrada y su admin verá un aviso.',
      aceptar: 'Sí, entrar',
    });
    if (!ok) {
      return;
    }
    this.ocupado.set(true);
    this.error.set(null);
    this.service
      .entrarEnSoporte(s.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sesion) => this.auth.entrarEnSoporte(sesion),
        error: (err: unknown) => {
          this.ocupado.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo entrar en modo soporte.'));
        },
      });
  }

  private ejecutar(peticion: ReturnType<PlataformaService['desbloquear']>, mensaje: string): void {
    this.ocupado.set(true);
    this.error.set(null);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (s) => {
        this.ocupado.set(false);
        this.sastreria.set(s);
        this.cargarAcciones();
        this.cambiado.emit({ sastreria: s, mensaje });
      },
      error: (err: unknown) => {
        this.ocupado.set(false);
        this.error.set(mensajeDeError(err, 'No se pudo hacer el cambio.'));
      },
    });
  }

  private cargar(): void {
    this.service
      .sastreria(this.sastreriaId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => this.sastreria.set(s),
        error: (err: unknown) =>
          this.error.set(mensajeDeError(err, 'No se pudo cargar la sastrería.')),
      });
    this.cargarAcciones();
  }

  private cargarAcciones(): void {
    this.service
      .acciones(0, 20, this.sastreriaId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => this.acciones.set(p.contenido),
        error: () => this.acciones.set([]),
      });
  }
}
