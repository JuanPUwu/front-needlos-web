import { EstadoSastreria } from '../../../../core/auth/estado-sastreria';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map, startWith } from 'rxjs';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import { mensajeDeError } from '../../../../core/http/api-error';
import { TicketComponent, TicketDatos } from '../../../../shared/ui/ticket/ticket';
import { hoyIso } from '../../../../shared/util/fechas';
import { Sastreria } from '../../models/sastreria.model';
import { SastreriaService } from '../../services/sastreria.service';

/** Al menos un caracter visible (el backend rechaza textos solo con espacios). */
const CON_TEXTO = /\S/;

/**
 * Configuración de la sastrería: nombre y datos opcionales para el ticket, con una vista
 * previa del ticket (datos de ejemplo) que se actualiza mientras se escribe.
 */
@Component({
  selector: 'app-configuracion-sastreria',
  imports: [
    TituloBloque,
    Esqueleto,
    Encabezado,
    ReactiveFormsModule,
    TicketComponent,
    FechaHoraPipe,
  ],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionSastreria implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly estadoSastreria = inject(EstadoSastreria);
  private readonly service = inject(SastreriaService);
  private readonly notificaciones = inject(Notificaciones);
  private readonly destroyRef = inject(DestroyRef);

  /** Plan y vencimiento (prueba o licencia). */
  readonly estadoPlan = this.estadoSastreria.estado;

  readonly sastreria = signal<Sastreria | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120), Validators.pattern(CON_TEXTO)]],
    nit: ['', [Validators.maxLength(30)]],
    direccion: ['', [Validators.maxLength(200)]],
    telefono: ['', [Validators.maxLength(20)]],
    horaInicioCaja: ['05:00', [Validators.required]],
    horaFinCaja: ['23:00', [Validators.required]],
  });

  /** El horario del resumen debe empezar antes de terminar. */
  horarioInvalido(): boolean {
    const v = this.form.getRawValue();
    return !!v.horaInicioCaja && !!v.horaFinCaja && v.horaInicioCaja >= v.horaFinCaja;
  }

  private readonly valores = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue()),
    ),
    { initialValue: this.form.getRawValue() },
  );

  /** Ticket de ejemplo con los datos del negocio tal como están en el formulario. */
  readonly vistaPrevia = computed<TicketDatos>(() => {
    const v = this.valores();
    const hoy = hoyIso();
    return {
      sastreria: {
        nombre: v.nombre.trim() || 'Nombre de tu sastrería',
        nit: v.nit.trim() || null,
        direccion: v.direccion.trim() || null,
        telefono: v.telefono.trim() || null,
      },
      numero: '#1024-58',
      fecha: hoy,
      fechaEntrega: hoy,
      cliente: { nombre: 'Laura', apellido: 'Gómez', telefono: '3001234567' },
      prendas: [
        {
          tipoPrenda: 'Pantalón',
          descripcion: 'Bota recta y ruedo',
          cantidad: 2,
          precioUnitario: 18000,
          subtotal: 36000,
        },
        {
          tipoPrenda: 'Camisa',
          descripcion: 'Ajuste de mangas',
          cantidad: 1,
          precioUnitario: 15000,
          subtotal: 15000,
        },
      ],
      subtotal: 51000,
      descuento: 1000,
      total: 50000,
      abonos: [{ fecha: new Date().toISOString(), metodo: 'NEQUI', monto: 20000 }],
      abonado: 20000,
      saldo: 30000,
      anulado: false,
      emitido: new Date().toISOString(),
    };
  });

  constructor() {
    // Al abrir Mi sastrería el admin ya ve la visita de soporte: el aviso del panel se apaga.
    effect(() => {
      if (this.estadoPlan()?.visitaSoporteSinVer) {
        untracked(() => this.estadoSastreria.marcarSoporteVisto());
      }
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  guardar(): void {
    if (this.form.invalid || this.horarioInvalido()) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.guardando()) {
      return;
    }
    this.guardando.set(true);
    this.error.set(null);

    const v = this.form.getRawValue();
    this.service
      .actualizar({
        nombre: v.nombre.trim(),
        nit: v.nit.trim() || null,
        direccion: v.direccion.trim() || null,
        telefono: v.telefono.trim() || null,
        horaInicioCaja: v.horaInicioCaja,
        horaFinCaja: v.horaFinCaja,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this.guardando.set(false);
          this.form.markAsPristine();
          this.notificaciones.exito('Datos de la sastrería guardados.');
          this.sastreria.set(s);
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudieron guardar los datos.'));
        },
      });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.service
      .obtener()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this.sastreria.set(s);
          this.form.reset({
            nombre: s.nombre,
            nit: s.nit ?? '',
            direccion: s.direccion ?? '',
            telefono: s.telefono ?? '',
            horaInicioCaja: s.horaInicioCaja ?? '05:00',
            horaFinCaja: s.horaFinCaja ?? '23:00',
          });
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo cargar la sastrería.'));
        },
      });
  }
}
