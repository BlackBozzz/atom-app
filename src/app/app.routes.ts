import { Routes } from '@angular/router';
import { ARGENT_AUTH_ROUTES, ARGENT_ROUTES } from '@argent/webapp-common';
import { FactoryPage } from './pages/factory-page/factory-page';

export const routes: Routes = [
  ...ARGENT_AUTH_ROUTES,
  ...ARGENT_ROUTES,
  {
    path: 'factory',
    component: FactoryPage,
  },
  {
    path: 'employees',
    loadComponent: () =>
      import('./pages/employee-page/employee-page').then((m) => m.EmployeesPage),
  }
];
