import { TestBed } from '@angular/core/testing';
import { convertToParamMap } from '@angular/router';
import { borrarTodoLoRecordado, guardarRutaDeRegreso, tomarRutaDeRegreso } from './almacen';
import { filtrosAUrl, filtrosDesdeUrl } from './filtros-url';
import { Memoria } from './memoria';

describe('estado recordado en el navegador', () => {
  beforeEach(() => localStorage.clear());

  it('Memoria guarda, lee, caduca y se borra al cerrar sesión', () => {
    const memoria = TestBed.inject(Memoria);
    memoria.guardar('borrador', { a: 1 });
    expect(memoria.leer('borrador')).toEqual({ a: 1 });

    memoria.guardar('viejo', 'x', -1);
    expect(memoria.leer('viejo')).toBeNull();

    borrarTodoLoRecordado();
    expect(memoria.leer('borrador')).toBeNull();
  });

  it('la ruta de regreso se toma una sola vez', () => {
    guardarRutaDeRegreso('/clientes?buscar=ana');
    expect(tomarRutaDeRegreso()).toBe('/clientes?buscar=ana');
    expect(tomarRutaDeRegreso()).toBeNull();
  });

  it('filtros: solo los distintos al inicial van a la URL y se leen con su tipo', () => {
    const iniciales = { estado: 'EN_PROCESO', buscar: '', vencidos: false, pagina: 1 };
    const filtros = { ...iniciales, estado: '', vencidos: true, pagina: 3 };
    expect(filtrosAUrl(filtros, iniciales)).toEqual({
      estado: '',
      buscar: null,
      vencidos: 'true',
      pagina: '3',
    });
    const leido = filtrosDesdeUrl(
      convertToParamMap({ estado: '', vencidos: 'true', pagina: '3' }),
      iniciales,
    );
    expect(leido).toEqual(filtros);
  });
});
