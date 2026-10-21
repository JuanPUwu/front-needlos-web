import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { SastreriaService } from '../../services/sastreria.service';
import { ImportarModal } from './importar-modal';

function archivo(texto: string): Event {
  const file = new File([texto], 'clientes.csv', { type: 'text/csv' });
  return { target: { files: [file], value: 'x' } } as unknown as Event;
}

describe('ImportarModal', () => {
  let vistaPrevia: ReturnType<typeof vi.fn>;
  let importar: ReturnType<typeof vi.fn>;
  let exito: ReturnType<typeof vi.fn>;
  let modal: ImportarModal;

  beforeEach(() => {
    vistaPrevia = vi.fn(() =>
      of({
        filas: [
          { linea: 2, resumen: 'Ana Ruiz · 3001234567', estado: 'NUEVO', motivo: null },
          {
            linea: 3,
            resumen: 'Ya Existe · 3001110000',
            estado: 'OMITIDO',
            motivo: 'Ya hay un cliente con ese teléfono',
          },
        ],
        nuevos: 1,
        omitidos: 1,
        errores: 0,
      }),
    );
    importar = vi.fn(() => of({ importados: 1, omitidos: 1 }));
    exito = vi.fn();
    TestBed.configureTestingModule({
      imports: [ImportarModal],
      providers: [
        { provide: SastreriaService, useValue: { vistaPrevia, importar, plantilla: vi.fn() } },
        { provide: Notificaciones, useValue: { exito, error: vi.fn(), info: vi.fn() } },
      ],
    });
    modal = TestBed.createComponent(ImportarModal).componentInstance;
  });

  it('al elegir el archivo muestra la vista previa sin guardar nada', async () => {
    await modal.alElegir(archivo('nombre;apellido;telefono\nAna;Ruiz;3001234567\n'));
    expect(vistaPrevia).toHaveBeenCalledWith('clientes', expect.stringContaining('Ana;Ruiz'));
    expect(importar).not.toHaveBeenCalled();
    expect(modal.vista()?.nuevos).toBe(1);
    expect(modal.puedeImportar()).toBe(true);
  });

  it('importa, avisa cuántos entraron y se cierra', async () => {
    const cerrado = vi.fn();
    modal.cerrado.subscribe(cerrado);
    await modal.alElegir(archivo('nombre;apellido;telefono\nAna;Ruiz;3001234567\n'));
    modal.importar();
    expect(importar).toHaveBeenCalled();
    expect(exito).toHaveBeenCalledWith('Se importaron 1 clientes (1 ya existían y se omitieron).');
    expect(cerrado).toHaveBeenCalled();
  });

  it('con filas con error no deja importar y lo explica en la línea del título', async () => {
    vistaPrevia.mockReturnValueOnce(
      of({
        filas: [{ linea: 2, resumen: 'X', estado: 'ERROR', motivo: 'Revisa el teléfono' }],
        nuevos: 0,
        omitidos: 0,
        errores: 1,
      }),
    );
    await modal.alElegir(archivo('nombre;apellido;telefono\nX;Y;12\n'));
    expect(modal.puedeImportar()).toBe(false);
    expect(modal.error()).toBe('1 fila con error: corrígela en el archivo');
  });
});
