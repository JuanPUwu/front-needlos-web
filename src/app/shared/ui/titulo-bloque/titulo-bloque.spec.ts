import { TestBed } from '@angular/core/testing';
import { TituloBloque } from './titulo-bloque';

describe('TituloBloque', () => {
  it('muestra el error en la misma fila del título, con el texto completo en title', () => {
    const fixture = TestBed.createComponent(TituloBloque);
    fixture.componentRef.setInput('titulo', 'Miembros');
    fixture.componentRef.setInput('error', 'El recurso solicitado no existe.');
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const error = host.querySelector('.tb__error') as HTMLElement;
    expect(host.querySelector('h2')?.textContent).toBe('Miembros');
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.title).toBe('El recurso solicitado no existe.');
  });

  it('sin error no agrega nada', () => {
    const fixture = TestBed.createComponent(TituloBloque);
    fixture.componentRef.setInput('titulo', 'Miembros');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.tb__error')).toBeNull();
  });
});
