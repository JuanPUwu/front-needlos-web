import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Confirmacion } from '../../../../core/ui/confirmacion';
import { Notificaciones } from '../../../../core/ui/notificaciones';
import { SastreriaService } from '../../services/sastreria.service';
import { ExportarModal } from './exportar-modal';

describe('ExportarModal', () => {
  let exportar: ReturnType<typeof vi.fn>;
  let avisar: ReturnType<typeof vi.fn>;
  let modal: ExportarModal;

  beforeEach(() => {
    exportar = vi.fn(() => of(new Blob(['zip'])));
    avisar = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      imports: [ExportarModal],
      providers: [
        { provide: SastreriaService, useValue: { exportar } },
        { provide: Confirmacion, useValue: { avisar, pedir: vi.fn() } },
        { provide: Notificaciones, useValue: { exito: vi.fn(), error: vi.fn(), info: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(ExportarModal);
    fixture.componentRef.setInput('sastreria', 'Sastrería Prueba');
    modal = fixture.componentInstance;
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
  });

  it('sin contraseña avisa qué falta y no exporta', () => {
    modal.exportar();
    expect(exportar).not.toHaveBeenCalled();
    expect(avisar).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Falta información' }));
  });

  it('con la contraseña descarga el archivo y se cierra', () => {
    const cerrado = vi.fn();
    modal.cerrado.subscribe(cerrado);
    modal.form.controls.confirmacion.setValue('Clave123!');
    modal.exportar();
    expect(exportar).toHaveBeenCalledWith('Clave123!');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(cerrado).toHaveBeenCalled();
  });

  it('si la contraseña no es correcta, el error va en la línea del título', () => {
    exportar.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: { code: 'CONFIRMACION_INCORRECTA', detail: 'La contraseña no es correcta.' },
          }),
      ),
    );
    modal.form.controls.confirmacion.setValue('mala');
    modal.exportar();
    expect(modal.error()).toBe('La contraseña no es correcta.');
  });
});
