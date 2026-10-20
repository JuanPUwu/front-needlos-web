import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PermisosService } from '../../../../core/auth/permisos';
import { EmpleadoService } from '../../../equipo/services/empleado.service';
import { PedidoService } from '../../services/pedido.service';
import { PedidoModal } from './pedido-modal';

describe('PedidoModal', () => {
  function crear() {
    TestBed.configureTestingModule({
      imports: [PedidoModal],
      providers: [
        provideRouter([]),
        { provide: PedidoService, useValue: { obtener: () => of() } },
        { provide: EmpleadoService, useValue: { asignables: () => of([]) } },
        { provide: PermisosService, useValue: { puede: () => true, admin: () => true } },
      ],
    });
    const fixture = TestBed.createComponent(PedidoModal);
    fixture.componentRef.setInput('pedidoId', 'p1');
    return fixture.componentInstance;
  }

  it('Escape en edición vuelve al detalle; en el detalle cierra el popup', () => {
    const modal = crear();
    let cerrado = false;
    modal.cerrado.subscribe(() => (cerrado = true));

    modal.editar();
    expect(modal.modo()).toBe('editar');
    modal.alEscape();
    expect(modal.modo()).toBe('ver');
    expect(cerrado).toBe(false);

    modal.alEscape();
    expect(cerrado).toBe(true);
  });
});
