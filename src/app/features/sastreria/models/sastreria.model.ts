// Modelos de la configuración de la sastrería, alineados con /api/v1/sastreria.

export interface Sastreria {
  id: string;
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  plan: string;
  licenciaHasta: string | null;
  activo: boolean;
}

export interface ActualizarSastreriaRequest {
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
}
