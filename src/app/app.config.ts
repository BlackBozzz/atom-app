
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideArgentWebapp } from '@argent/webapp-common';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideArgentWebapp({
      auth: {
        apiBaseUrl: '/api/auth',
        loginPath: '/login'
      },
      dictionary: {
        apiBaseUrl: '/api/argent-dictionary'
      }
    })
  ]
};
