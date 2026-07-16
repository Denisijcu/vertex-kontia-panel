import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { FooterComponent } from './shared/footer/footer.component';
import { HeaderComponent } from './shared/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, HeaderComponent, FooterComponent],
  template: `
    <div class="shell">
      <app-header />

      <div class="cuerpo">
        <aside class="sidebar">
          <div class="brand">
            <span class="display brand-name">Kontia</span>
            <span class="brand-sub">{{ auth.user()?.tenant_name ?? 'Kontia' }}</span>
          </div>

          <nav>
            <a routerLink="/dashboard" routerLinkActive="activa">Dashboard</a>
            <a routerLink="/agente" routerLinkActive="activa">Agente</a>
            <a routerLink="/asientos" routerLinkActive="activa">Asientos</a>
            <a routerLink="/cuentas" routerLinkActive="activa">Cuentas</a>
            <a routerLink="/activos" routerLinkActive="activa">Activos</a>
            <a routerLink="/facturas" routerLinkActive="activa">Facturas</a>
            <a routerLink="/conciliacion" routerLinkActive="activa">Conciliación</a>
            <a routerLink="/hallazgos" routerLinkActive="activa">Hallazgos</a>
            @if (auth.user()?.role !== 'viewer') {
              <a routerLink="/migracion" routerLinkActive="activa">Migración</a>
            }
            @if (auth.user()?.role === 'owner') {
              <a routerLink="/usuarios" routerLinkActive="activa">Usuarios</a>
              <a routerLink="/api-keys" routerLinkActive="activa">API Keys</a>
              <a routerLink="/cierre" routerLinkActive="activa">Cierre</a>
            }
            @if (auth.isPlatformAdmin()) {
              <a routerLink="/admin/tenants" routerLinkActive="activa" class="admin-link">
                Admin
              </a>
            }
          </nav>
        </aside>

        <main class="contenido">
          <router-outlet />
        </main>
      </div>

      <app-footer />
    </div>
  `,
  styles: [
    `
      .shell {
        display: grid;
        grid-template-rows: auto 1fr auto;
        min-height: 100vh;
      }
      .cuerpo {
        display: grid;
        grid-template-columns: 230px 1fr;
        min-height: 0;
      }
      .sidebar {
        border-right: 1px solid var(--linea);
        padding: 24px 16px;
        display: flex;
        flex-direction: column;
        gap: 28px;
      }
      .brand { display: flex; flex-direction: column; gap: 2px; }
      .brand-name { font-size: 28px; color: var(--laton); letter-spacing: 0.02em; }
      .brand-sub { font-size: 12px; color: var(--papel-tenue); }
      nav { display: flex; flex-direction: column; gap: 4px; }
      nav a {
        color: var(--papel);
        text-decoration: none;
        padding: 9px 12px;
        border-radius: var(--radio);
        border-left: 2px solid transparent;
      }
      nav a:hover { background: var(--superficie-2); }
      nav a.activa {
        background: var(--superficie);
        border-left-color: var(--laton);
        color: var(--laton);
      }
      nav a.admin-link {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--linea);
        color: var(--laton);
        font-size: 13px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .pronto { padding: 9px 12px; font-size: 13px; color: var(--papel-tenue); opacity: 0.6; }
      .contenido { padding: 32px 40px; max-width: 1100px; }
      @media (max-width: 800px) {
        .cuerpo { grid-template-columns: 1fr; }
        .sidebar { flex-direction: row; align-items: center; padding: 12px 14px; gap: 16px; }
        nav { flex-direction: row; }
        .pronto { display: none; }
        .contenido { padding: 20px; }
      }
    `,
  ],
})
export class App {
  auth = inject(AuthService);
}