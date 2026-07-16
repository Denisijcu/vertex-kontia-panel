import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { platformAdminGuard } from './core/guards/platform-admin.guard';

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
    path: 'conciliacion',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/conciliacion/conciliacion.component').then(m => m.ConciliacionComponent),
  },
  {
    path: 'hallazgos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/hallazgos/hallazgos.component').then(m => m.HallazgosComponent),
  },
  {
    path: 'usuarios',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/usuarios/usuarios.component').then(m => m.UsuariosComponent),
  },
  {
    path: 'api-keys',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/api-keys/api-keys.component').then(m => m.ApiKeysComponent),
  },
  {
    path: 'cierre',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/cierre/cierre.component').then(m => m.CierreComponent),
  },
  {
    path: 'migracion',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/migracion/migracion.component').then(m => m.MigracionComponent),
  },
  {
    path: 'migracion/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/migracion-detalle/migracion-detalle.component').then(
        m => m.MigracionDetalleComponent
      ),
  },
  {
    path: 'admin/tenants',
    canActivate: [authGuard, platformAdminGuard],
    loadComponent: () =>
      import('./features/admin-tenants/admin-tenants.component').then(
        m => m.AdminTenantsComponent
      ),
  },
  {
    path: 'admin/tenants/:id',
    canActivate: [authGuard, platformAdminGuard],
    loadComponent: () =>
      import('./features/admin-tenant-detail/admin-tenant-detail.component').then(
        m => m.AdminTenantDetailComponent
      ),
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