import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { FILTROS_ACTIVIDAD_INICIALES } from '../models/actividad.model';
import { ActividadService } from './actividad.service';

describe('ActividadService', () => {
  it('envía solo los filtros elegidos, con la página', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(ActividadService);
    const http = TestBed.inject(HttpTestingController);

    service
      .listar({ ...FILTROS_ACTIVIDAD_INICIALES, categoria: 'PEDIDOS', buscar: ' #12-5 ' }, 1, 20)
      .subscribe();

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/api/v1/actividad`);
    expect(req.request.params.get('categoria')).toBe('PEDIDOS');
    expect(req.request.params.get('buscar')).toBe('#12-5');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.has('persona')).toBe(false);
    req.flush({ contenido: [], pagina: 1, tamano: 20, totalElementos: 0, totalPaginas: 0 });
  });
});
