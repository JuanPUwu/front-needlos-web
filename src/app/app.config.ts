import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { Auth } from './core/auth/auth';
// SSR desactivado — para reactivar: agregar provideClientHydration(withEventReplay()) desde @angular/platform-browser
// y en angular.json: "server", "outputMode": "server", "ssr": { "entry": "src/server.ts" }

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: (auth: Auth) => () => auth.initializeSession(),
      deps: [Auth],
      multi: true,
    },
  ]
};
