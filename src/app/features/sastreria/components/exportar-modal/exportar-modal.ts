import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { Icono } from '../../../../shared/ui/icono/icono';
import { avisoFaltantes } from '../../../../shared/util/faltantes';
import { hoyIso } from '../../../../shared/util/fechas';
import { SastreriaService } from '../../services/sastreria.service';

/**
 * Exportar toda la información de la sastrería (Manual §16.1): explica qué trae el .zip, advierte
 * que lleva datos personales y pide confirmar con la contraseña (o con el nombre de la sastrería
 * si la cuenta entra solo con Google). Al terminar descarga el archivo y se cierra.
 */
@Component({
  selector: 'app-exportar-modal',
  imports: [ReactiveFormsModule, Encabezado, Icono],
  templateUrl: './exportar-modal.html',
  styleUrl: './exportar-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cerrar()' },
})
export class ExportarModal implements OnDestroy {
  private readonly service = inject(SastreriaService);
  private readonly auth = inject(AuthService);
  private readonly confirmacion = inject(Confirmacion);
  private readonly notificaciones = inject(Notificaciones);
  private readonly destroyRef = inject(DestroyRef);

  /** Nombre de la sastrería: da nombre al archivo. */
  readonly sastreria = input.required<string>();
  readonly cerrado = output<void>();

  readonly exportando = signal(false);
  readonly error = signal<string | null>(null);
  readonly verClave = signal(false);
  /** Cuenta de Google sin contraseña: confirma con el nombre de la sastrería. */
  readonly conContrasena = computed(() => this.auth.sesion()?.cuenta?.tieneContrasena !== false);

  readonly form = inject(FormBuilder).nonNullable.group({
    confirmacion: ['', [Validators.required]],
  });

  private readonly caja = viewChild<ElementRef<HTMLElement>>('caja');
  private readonly focoPrevio = document.activeElement as HTMLElement | null;

  constructor() {
    afterNextRender(() => this.caja()?.nativeElement.querySelector('input')?.focus());
  }

  ngOnDestroy(): void {
    this.focoPrevio?.focus?.();
  }

  cerrar(): void {
    if (!this.exportando()) {
      this.cerrado.emit();
    }
  }

  /** Cuenta sin contraseña: el nombre escrito debe ser exacto (mayúsculas y minúsculas). */
  nombreCoincide(): boolean {
    return (
      this.conContrasena() ||
      this.form.controls.confirmacion.value.trim() === this.sastreria().trim()
    );
  }

  exportar(): void {
    if (this.form.valid && !this.nombreCoincide()) {
      this.form.markAllAsTouched();
      void this.confirmacion.avisar({
        titulo: 'Revisa la información',
        mensaje: `Escribe el nombre exactamente como aparece: «${this.sastreria()}», con sus mayúsculas y minúsculas.`,
      });
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const aviso = avisoFaltantes(this.form, 'exportar', {
        confirmacion: this.conContrasena() ? 'tu contraseña' : 'el nombre de la sastrería',
      });
      if (aviso) {
        void this.confirmacion.avisar(aviso);
      }
      return;
    }
    this.exportando.set(true);
    this.error.set(null);
    this.service
      .exportar(this.form.controls.confirmacion.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (zip) => {
          this.exportando.set(false);
          descargar(zip, `needlos-${nombreDeArchivo(this.sastreria())}-${hoyIso()}.zip`);
          this.notificaciones.exito('Información exportada. Revisa tus descargas.');
          this.cerrado.emit();
        },
        error: (err: unknown) => {
          this.exportando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo exportar la información.'));
        },
      });
  }
}

/** "Sastrería Prueba" → "sastreria-prueba". */
function nombreDeArchivo(nombre: string): string {
  return (
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'sastreria'
  );
}

function descargar(contenido: Blob, nombre: string): void {
  const url = URL.createObjectURL(contenido);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
