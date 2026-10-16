import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../../../core/http/api-error';
import { Sastreria } from '../../models/sastreria.model';
import { SastreriaService } from '../../services/sastreria.service';

/** Al menos un caracter visible (el backend rechaza textos solo con espacios). */
const CON_TEXTO = /\S/;

/** Configuración de la sastrería: nombre y datos opcionales para el ticket. */
@Component({
  selector: 'app-configuracion-sastreria',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionSastreria implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SastreriaService);
  private readonly destroyRef = inject(DestroyRef);

  readonly sastreria = signal<Sastreria | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly exito = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120), Validators.pattern(CON_TEXTO)]],
    nit: ['', [Validators.maxLength(30)]],
    direccion: ['', [Validators.maxLength(200)]],
    telefono: ['', [Validators.maxLength(20)]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.guardando()) {
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    this.exito.set(false);

    const v = this.form.getRawValue();
    this.service
      .actualizar({
        nombre: v.nombre.trim(),
        nit: v.nit.trim() || null,
        direccion: v.direccion.trim() || null,
        telefono: v.telefono.trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this.guardando.set(false);
          this.exito.set(true);
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
