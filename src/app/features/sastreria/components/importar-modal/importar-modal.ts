import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { Icono } from '../../../../shared/ui/icono/icono';
import {
  COLUMNAS,
  TIPOS_IMPORTACION,
  TipoImportacion,
  VistaPrevia,
} from '../../models/importacion.model';
import { SastreriaService } from '../../services/sastreria.service';

/**
 * Importar clientes, catálogo o inventario desde una plantilla CSV (Manual §16.1): se descarga la
 * plantilla, se elige el archivo, se ve una vista previa (qué entra, qué se omite y por qué, qué
 * tiene error) y se importa todo o nada.
 */
@Component({
  selector: 'app-importar-modal',
  imports: [Encabezado, Icono],
  templateUrl: './importar-modal.html',
  styleUrl: './importar-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cerrar()' },
})
export class ImportarModal implements OnDestroy {
  private readonly service = inject(SastreriaService);
  private readonly notificaciones = inject(Notificaciones);
  private readonly destroyRef = inject(DestroyRef);

  readonly cerrado = output<void>();
  /** Se importó algo: la sección puede recargar lo que muestra. */
  readonly importado = output<void>();

  readonly tipos = TIPOS_IMPORTACION;
  readonly tipo = signal<TipoImportacion>('clientes');
  readonly archivo = signal<{ nombre: string; contenido: string } | null>(null);
  readonly vista = signal<VistaPrevia | null>(null);
  readonly ocupado = signal(false);
  readonly error = signal<string | null>(null);

  /** Columnas que debe llevar la plantilla del tipo elegido. */
  readonly columnas = computed(() => COLUMNAS[this.tipo()]);
  readonly plural = computed(() => this.tipos.find((t) => t.valor === this.tipo())?.plural ?? '');
  readonly puedeImportar = computed(() => {
    const v = this.vista();
    return !!v && v.errores === 0 && v.nuevos > 0 && !this.ocupado();
  });

  private readonly focoPrevio = document.activeElement as HTMLElement | null;

  ngOnDestroy(): void {
    this.focoPrevio?.focus?.();
  }

  cerrar(): void {
    if (!this.ocupado()) {
      this.cerrado.emit();
    }
  }

  elegirTipo(tipo: TipoImportacion): void {
    this.tipo.set(tipo);
    this.archivo.set(null);
    this.vista.set(null);
    this.error.set(null);
  }

  descargarPlantilla(): void {
    const tipo = this.tipo();
    this.service
      .plantilla(tipo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (csv) => descargar(csv, `plantilla-${tipo}.csv`),
        error: (err: unknown) =>
          this.error.set(mensajeDeError(err, 'No se pudo descargar la plantilla.')),
      });
  }

  /** Lee el archivo elegido (UTF-8 o, si Excel lo guardó en su formato antiguo, Windows-1252). */
  async alElegir(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const elegido = input.files?.[0];
    input.value = '';
    if (!elegido) {
      return;
    }
    const bytes = new Uint8Array(await elegido.arrayBuffer());
    let contenido: string;
    try {
      contenido = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      contenido = new TextDecoder('windows-1252').decode(bytes);
    }
    this.archivo.set({ nombre: elegido.name, contenido });
    this.revisar();
  }

  private revisar(): void {
    const archivo = this.archivo();
    if (!archivo) {
      return;
    }
    this.ocupado.set(true);
    this.error.set(null);
    this.vista.set(null);
    this.service
      .vistaPrevia(this.tipo(), archivo.contenido)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (vista) => {
          this.ocupado.set(false);
          this.vista.set(vista);
          if (vista.errores > 0) {
            // Los errores van en la línea del título (Reglas): qué hacer, no solo qué pasó.
            this.error.set(
              vista.errores === 1
                ? '1 fila con error: corrígela en el archivo'
                : `${vista.errores} filas con error: corrígelas en el archivo`,
            );
          }
        },
        error: (err: unknown) => {
          this.ocupado.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo revisar el archivo.'));
        },
      });
  }

  importar(): void {
    const archivo = this.archivo();
    if (!archivo || !this.puedeImportar()) {
      return;
    }
    this.ocupado.set(true);
    this.error.set(null);
    this.service
      .importar(this.tipo(), archivo.contenido)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.ocupado.set(false);
          const omitidos = r.omitidos > 0 ? ` (${r.omitidos} ya existían y se omitieron)` : '';
          this.notificaciones.exito(`Se importaron ${r.importados} ${this.plural()}${omitidos}.`);
          this.importado.emit();
          this.cerrado.emit();
        },
        error: (err: unknown) => {
          this.ocupado.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo importar.'));
        },
      });
  }
}

function descargar(contenido: Blob, nombre: string): void {
  const url = URL.createObjectURL(contenido);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
