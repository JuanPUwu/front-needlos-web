import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
// SSR desactivado — para reactivar: agregar provideClientHydration(withEventReplay()) desde @angular/platform-browser
// y en angular.json: "server", "outputMode": "server", "ssr": { "entry": "src/server.ts" }

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
  ]
};
