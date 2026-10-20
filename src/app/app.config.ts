import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { PreloadAllModules, provideRouter, withPreloading } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { apiInterceptor } from './core/http/api.interceptor';
import { actividadInterceptor } from './core/ui/actividad';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Precarga el código de todas las secciones en segundo plano: al entrar a una, se ve al
    // instante (incluso en conexiones lentas) y solo esperan sus datos, con skeleton.
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([actividadInterceptor, apiInterceptor])),
    // Recupera la sesion (cookie HttpOnly) antes de la primera navegacion.
    provideAppInitializer(() => inject(AuthService).restaurarSesion()),
  ],
};
