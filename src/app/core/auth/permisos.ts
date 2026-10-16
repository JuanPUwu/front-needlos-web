import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Acciones que el SASTRE_ADMIN otorga a cada miembro (alineado con el enum Permiso del
 * backend). El SASTRE_ADMIN las tiene todas; un SASTRE nuevo, ninguna.
 */
export type Permiso =
  | 'GESTIONAR_CLIENTES'
  | 'CREAR_PEDIDOS'
  | 'CAMBIAR_ESTADO_PRENDAS'
  | 'ENTREGAR_PRENDAS'
  | 'ASIGNAR_SASTRE'
  | 'REGISTRAR_ABONOS';

/** Permisos en el orden y con el texto que se muestran en Equipo. */
export const PERMISOS: { valor: Permiso; etiqueta: string; ayuda: string }[] = [
  { valor: 'CREAR_PEDIDOS', etiqueta: 'Crear pedidos', ayuda: 'Incluye poner el precio.' },
  {
    valor: 'CAMBIAR_ESTADO_PRENDAS',
    etiqueta: 'Cambiar estado de prendas',
    ayuda: 'En proceso ↔ finalizada.',
  },
  { valor: 'ENTREGAR_PRENDAS', etiqueta: 'Entregar prendas', ayuda: 'Marcar como entregadas.' },
  { valor: 'ASIGNAR_SASTRE', etiqueta: 'Asignar sastre', ayuda: 'A cada prenda.' },
  { valor: 'REGISTRAR_ABONOS', etiqueta: 'Registrar abonos', ayuda: 'Cobrar a los clientes.' },
  { valor: 'GESTIONAR_CLIENTES', etiqueta: 'Crear y editar clientes', ayuda: 'En Clientes.' },
];

interface MisPermisos {
  accesoId: string;
  admin: boolean;
  permisos: Permiso[];
}

/**
 * Permisos del usuario en la sastrería activa, para mostrar u ocultar acciones. Se cargan
 * solos al iniciar sesión o cambiar de sastrería. Solo mejoran la experiencia: el backend
 * siempre vuelve a verificarlos.
 */
@Injectable({ providedIn: 'root' })
export class PermisosService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly estado = signal<MisPermisos | null>(null);

  /** Mi acceso en esta sastrería (es mi id como sastre en las prendas). */
  readonly accesoId = computed(() => this.estado()?.accesoId ?? null);
  readonly admin = computed(() => this.estado()?.admin ?? false);
  readonly cargados = computed(() => this.estado() !== null);
  private readonly lista = computed(() => new Set(this.estado()?.permisos ?? []));

  constructor() {
    effect(() => {
      const sesion = this.auth.sesion();
      const tenant = sesion?.sastreria?.tenantId ?? null;
      if (!tenant) {
        this.estado.set(null);
        return;
      }
      this.recargar();
    });
  }

  puede(permiso: Permiso): boolean {
    return this.lista().has(permiso);
  }

  recargar(): void {
    this.http.get<MisPermisos>(`${environment.apiUrl}/api/v1/permisos/mios`).subscribe({
      next: (p) => this.estado.set(p),
      error: () => this.estado.set(null),
    });
  }
}
