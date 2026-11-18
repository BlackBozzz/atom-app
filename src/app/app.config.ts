
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideArgentWebapp } from '@argent/webapp-common';

import { routes } from './app.routes';
import { provideNgDiagram } from 'ng-diagram';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideArgentWebapp({
      auth: {
        apiBaseUrl: '/api/auth',
        loginPath: '/login',
      },
      dictionary: {
        apiBaseUrl: '/api/argent-dictionary',
      },
    }),
    provideNgDiagram(), // Изолирует сервисы диаграммы
  ],
};
