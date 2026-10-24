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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { Encabezado } from '../../../../shared/ui/encabezado/encabezado';
import { TituloBloque } from '../../../../shared/ui/titulo-bloque/titulo-bloque';
import { Memoria } from '../../../../core/estado/memoria';
import { recordarFormulario } from '../../../../core/estado/recordar-formulario';
import { codigoDeError, mensajeDeError } from '../../../../core/http/api-error';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { coincide } from '../../../../shared/util/texto';
import { GuardarTipoPrendaRequest, TipoPrenda } from '../../models/tipo-prenda.model';
import { TipoPrendaService } from '../../services/tipo-prenda.service';
import { recargaAutomatica } from '../../../../core/estado/recarga-automatica';
import { BotonRecargar } from '../../../../shared/ui/boton-recargar/boton-recargar';
import { Vacio } from '../../../../shared/ui/vacio/vacio';
import { avisoFaltantes } from '../../../../shared/util/faltantes';
import { ERROR_MONTO, montoCop } from '../../../../shared/validators/monto.validators';

/** Al menos un caracter visible (el backend rechaza textos solo con espacios). */
const CON_TEXTO = /\S/;

export type EstadoFiltro = 'todos' | 'activos' | 'inactivos';

/**
 * Catálogo de tipos de prenda (solo SASTRE_ADMIN, desde Ajustes): crear, renombrar,
 * precio base opcional y desactivar/reactivar (no se borra: los pedidos lo usan).
 */
@Component({
  selector: 'app-catalogo',
  imports: [
    Vacio,
    BotonRecargar,
    TituloBloque,
    Esqueleto,
    Encabezado,
    ReactiveFormsModule,
    MonedaPipe,
  ],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalogo implements OnInit {
  /** Pesos: entero y múltiplo de 50 (dueño 2026-10-23). */
  readonly errorMonto = ERROR_MONTO;
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TipoPrendaService);
  private readonly memoria = inject(Memoria);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notificaciones = inject(Notificaciones);
  private readonly confirmacion = inject(Confirmacion);
  private readonly destroyRef = inject(DestroyRef);

  readonly tipos = signal<TipoPrenda[]>([]);
  readonly cargando = signal(true);
  /** Ya cargó una vez: recargar no vuelve al esqueleto (conserva lo que se ve). */
  readonly listo = signal(false);
  readonly error = signal<string | null>(null);

  readonly editando = signal<TipoPrenda | null>(null);
  readonly guardando = signal(false);
  readonly errorForm = signal<string | null>(null);
  readonly accionId = signal<string | null>(null);

  readonly activos = computed(() => this.tipos().filter((t) => t.activo).length);
  readonly inactivos = computed(() => this.tipos().filter((t) => !t.activo).length);

  // Filtros (la lista es corta y llega completa: se filtra en el navegador).
  // Vienen de la URL (`?buscar=&estado=`) y se escriben en ella al cambiar.
  readonly buscar = signal(this.route.snapshot.queryParamMap.get('buscar') ?? '');
  readonly estado = signal<EstadoFiltro>(
    (this.route.snapshot.queryParamMap.get('estado') as EstadoFiltro | null) ?? 'todos',
  );
  readonly hayFiltros = computed(() => this.buscar() !== '' || this.estado() !== 'todos');
  readonly visibles = computed(() => {
    const estado = this.estado();
    return this.tipos().filter(
      (t) =>
        (estado === 'todos' || (estado === 'activos') === t.activo) &&
        coincide(this.buscar(), t.nombre),
    );
  });

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(60), Validators.pattern(CON_TEXTO)]],
    precioBase: ['', [montoCop]],
  });

  /** Formulario a medio llenar (y qué se editaba): sobrevive a la recarga. */
  private readonly borrador = recordarFormulario<{ editando: TipoPrenda | null }>(
    this.form,
    this.memoria,
    'catalogo:form',
    this.destroyRef,
    {
      extra: () => ({ editando: this.editando() }),
    },
  );

  constructor() {
    recargaAutomatica(() => this.recargar());
    // Filtros en la URL: una recarga deja la lista igual.
    effect(() => {
      const queryParams = {
        buscar: this.buscar() || null,
        estado: this.estado() === 'todos' ? null : this.estado(),
      };
      untracked(() =>
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams,
          queryParamsHandling: 'merge',
          replaceUrl: true,
        }),
      );
    });
  }

  ngOnInit(): void {
    const guardado = this.borrador.leer();
    if (guardado) {
      this.editando.set(guardado.editando);
      this.form.patchValue(guardado.valores);
      this.form.markAsDirty();
    }
    this.cargar();
  }

  /** Trae lo último sin perder lo que se ve. */
  recargar(): void {
    this.cargar();
  }

  alBuscar(texto: string): void {
    this.buscar.set(texto.trim());
  }

  alCambiarEstado(estado: string): void {
    this.estado.set(estado as EstadoFiltro);
  }

  limpiarFiltros(): void {
    this.buscar.set('');
    this.estado.set('todos');
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Qué falta, en un aviso que hay que aceptar (dueño 2026-10-20).
      const aviso = avisoFaltantes(
        this.form,
        this.editando() ? 'guardar el tipo de prenda' : 'crear el tipo de prenda',
        { nombre: 'el nombre', precioBase: 'el precio base' },
        [],
      );
      if (aviso) {
        void this.confirmacion.avisar(aviso);
      }
      return;
    }
    if (this.guardando()) {
      return;
    }
    this.guardando.set(true);
    this.limpiarAvisos();

    const actual = this.editando();
    const datos = this.datos();
    const peticion = actual
      ? this.service.actualizar(actual.id, actual.version, datos)
      : this.service.crear(datos);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (tipo) => {
        this.guardando.set(false);
        this.notificaciones.exito(
          actual
            ? `Tipo de prenda "${tipo.nombre}" actualizado.`
            : `Tipo de prenda "${tipo.nombre}" agregado al catálogo.`,
        );
        this.reiniciar();
        this.cargar();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.errorForm.set(mensajeDeError(err, 'No se pudo guardar el tipo de prenda.'));
        if (codigoDeError(err) === 'CONFLICTO_CONCURRENCIA') {
          this.reiniciar();
          this.cargar();
        }
      },
    });
  }

  editar(tipo: TipoPrenda): void {
    this.editando.set(tipo);
    this.limpiarAvisos();
    this.form.reset({
      nombre: tipo.nombre,
      precioBase: tipo.precioBase === null ? '' : String(tipo.precioBase),
    });
  }

  /** Cancelar: si hay cambios sin guardar, pide confirmar antes de perderlos (Reglas §12.2). */
  async cancelar(): Promise<void> {
    if (
      this.form.dirty &&
      !(await this.confirmacion.pedir({
        titulo: '¿Descartar los cambios?',
        mensaje: 'Lo que escribiste no se guardará.',
        aceptar: 'Sí, descartar',
        cancelar: 'Seguir editando',
        peligro: true,
      }))
    ) {
      return;
    }
    this.reiniciar();
  }

  /** Vacía el formulario y olvida el borrador sin preguntar (tras guardar o un conflicto). */
  private reiniciar(): void {
    this.borrador.olvidar();
    this.editando.set(null);
    this.form.reset();
  }

  async desactivar(tipo: TipoPrenda): Promise<void> {
    const ok = await this.confirmacion.pedir({
      titulo: `¿Desactivar "${tipo.nombre}"?`,
      mensaje:
        'Dejará de ofrecerse en pedidos nuevos. Los pedidos que ya lo tienen no cambian y puedes reactivarlo cuando quieras.',
      aceptar: 'Sí, desactivar',
      peligro: true,
    });
    if (ok) {
      this.cambiarEstado(tipo, this.service.desactivar(tipo.id));
    }
  }

  /**
   * Eliminar (dueño 2026-10-23): solo si nunca se usó en un pedido. Si ya se usó, el aviso explica
   * que hay que desactivarlo (popup, como los demás bloqueos de eliminar).
   */
  async eliminar(tipo: TipoPrenda): Promise<void> {
    if (this.accionId()) {
      return;
    }
    const ok = await this.confirmacion.pedir({
      titulo: `¿Eliminar "${tipo.nombre}"?`,
      mensaje:
        'Desaparece del catálogo. Solo se puede si nunca se usó en un pedido; si ya se usó, desactívalo.',
      aceptar: 'Sí, eliminar',
      peligro: true,
    });
    if (!ok) {
      return;
    }
    this.accionId.set(tipo.id);
    this.limpiarAvisos();
    this.service
      .eliminar(tipo.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.accionId.set(null);
          if (this.editando()?.id === tipo.id) {
            this.reiniciar();
          }
          this.tipos.update((lista) => lista.filter((t) => t.id !== tipo.id));
          this.notificaciones.exito(`Tipo de prenda "${tipo.nombre}" eliminado del catálogo.`);
        },
        error: (err: unknown) => {
          this.accionId.set(null);
          if (codigoDeError(err) === 'TIPO_PRENDA_EN_USO') {
            void this.confirmacion.avisar({
              titulo: 'No se puede eliminar',
              mensaje: mensajeDeError(err, 'Ya se usó en pedidos: desactívalo.'),
              tipo: 'advertencia',
            });
            return;
          }
          this.error.set(mensajeDeError(err, 'No se pudo eliminar el tipo de prenda.'));
        },
      });
  }

  reactivar(tipo: TipoPrenda): void {
    this.cambiarEstado(tipo, this.service.reactivar(tipo.id));
  }

  private cambiarEstado(tipo: TipoPrenda, peticion: Observable<TipoPrenda>): void {
    if (this.accionId()) {
      return;
    }
    this.accionId.set(tipo.id);
    this.limpiarAvisos();
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (actualizado) => {
        this.accionId.set(null);
        this.tipos.update((lista) => lista.map((t) => (t.id === actualizado.id ? actualizado : t)));
        if (this.editando()?.id === actualizado.id) {
          this.reiniciar();
        }
      },
      error: (err: unknown) => {
        this.accionId.set(null);
        this.error.set(mensajeDeError(err, 'No se pudo cambiar el estado.'));
      },
    });
  }

  private datos(): GuardarTipoPrendaRequest {
    const v = this.form.getRawValue();
    const precio = v.precioBase.trim();
    return { nombre: v.nombre.trim(), precioBase: precio ? Number(precio) : null };
  }

  private limpiarAvisos(): void {
    this.errorForm.set(null);
    this.error.set(null);
  }

  private cargar(): void {
    this.cargando.set(true);
    this.service
      .listar(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => {
          this.tipos.set(lista);
          this.listo.set(true);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err, 'No se pudo cargar el catálogo.'));
        },
      });
  }
}
