import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },
  {
    path: 'agente',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/agente/agente.component').then((m) => m.AgenteComponent),
  },
  {
    path: 'asientos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/asientos/asientos.component').then(
        (m) => m.AsientosComponent
      ),
  },
  {
    path: 'cuentas',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/cuentas/cuentas.component').then(
        (m) => m.CuentasComponent
      ),
  },
  {
    path: 'facturas',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/facturas/facturas.component').then(m => m.FacturasComponent),
  },
  {
    path: 'activos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/activos/activos.component').then(m => m.ActivosComponent),
  },
  {
    path: '404',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (m) => m.NotFoundComponent
      ),
  },

  { path: '**', redirectTo: '404' },
];