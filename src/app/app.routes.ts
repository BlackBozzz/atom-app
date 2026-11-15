import { Routes } from '@angular/router';
import { ARGENT_AUTH_ROUTES, ARGENT_ROUTES } from '@argent/webapp-common';

export const routes: Routes = [
  ...ARGENT_AUTH_ROUTES,
  ...ARGENT_ROUTES,
];
