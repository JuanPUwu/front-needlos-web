import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { Icono } from '../icono/icono';

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const DIAS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

interface Dia {
  iso: string;
  numero: number;
  delMes: boolean;
  deshabilitado: boolean;
  esHoy: boolean;
}

/** yyyy-MM-dd de una fecha local (sin pasar por UTC, que cambiaría el día). */
function iso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dia}`;
}

function desdeIso(texto: string): Date {
  const [a, m, d] = texto.split('-').map(Number);
  return new Date(a, m - 1, d);
}

/**
 * Calendario de un mes para elegir una fecha (yyyy-MM-dd). Siempre visible (no es un
 * desplegable): se usa para la fecha de entrega del pedido. Días anteriores a `minimo`
 * deshabilitados; navegación por meses; teclado y lectores de pantalla.
 */
@Component({
  selector: 'app-calendario',
  imports: [Icono],
  templateUrl: './calendario.html',
  styleUrl: './calendario.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Calendario {
  readonly valor = input<string>('');
  readonly minimo = input<string>('');
  /** Solo muestra la fecha (p. ej. en el detalle del pedido): los días no se pueden elegir. */
  readonly soloLectura = input(false);
  readonly cambio = output<string>();

  readonly dias = DIAS;
  readonly hoy = iso(new Date());

  /** Primer día del mes que se muestra (arranca en el mes de la fecha elegida o el actual). */
  readonly mes = linkedSignal(() => {
    const base = this.valor() ? desdeIso(this.valor()) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  readonly titulo = computed(() => `${MESES[this.mes().getMonth()]} ${this.mes().getFullYear()}`);
  readonly puedeRetroceder = computed(() => {
    const min = this.minimo();
    return !min || iso(this.mes()) > min.slice(0, 8) + '01';
  });

  /** 6 semanas (42 días) empezando el domingo anterior al día 1. */
  readonly semanas = computed<Dia[][]>(() => {
    const primero = this.mes();
    const inicio = new Date(primero);
    inicio.setDate(1 - primero.getDay());
    const min = this.minimo();
    const dias: Dia[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      const texto = iso(d);
      dias.push({
        iso: texto,
        numero: d.getDate(),
        delMes: d.getMonth() === primero.getMonth(),
        deshabilitado: !!min && texto < min,
        esHoy: texto === this.hoy,
      });
    }
    return Array.from({ length: 6 }, (_, s) => dias.slice(s * 7, s * 7 + 7));
  });

  mover(meses: number): void {
    const m = this.mes();
    this.mes.set(new Date(m.getFullYear(), m.getMonth() + meses, 1));
  }

  elegir(dia: Dia): void {
    if (!dia.deshabilitado && !this.soloLectura()) {
      this.cambio.emit(dia.iso);
    }
  }
}
