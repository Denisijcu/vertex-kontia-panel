
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminTenantDetail, KontiaApi } from '../../core/services/kontia-api.service';

@Component({
  selector: 'app-admin-tenant-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a class="volver" routerLink="/admin/tenants">← Volver a Tenants</a>

    @if (cargando()) {
      <section class="card tenue">Consultando tenant…</section>
    } @else if (detalle(); as d) {
      <div class="eyebrow">Detalle de tenant · {{ d.tenant_id }}</div>
      <h1 class="titulo">{{ d.name }}</h1>

      <section class="sello" [class.roto]="!d.equation_holds">
        <div class="resumen">
          <div class="dato">
            <span class="etiqueta">Moneda</span>
            <span class="valor">{{ d.base_currency }}</span>
          </div>
          <div class="dato">
            <span class="etiqueta">Total activos</span>
            <span class="valor cifra">{{ fmt(d.total_assets) }}</span>
          </div>
          <div class="dato">
            <span class="etiqueta">Creado</span>
            <span class="valor cifra">{{ d.created_at.slice(0, 10) }}</span>
          </div>
        </div>
        <div class="estampa" [class.ok]="d.equation_holds">
          {{ d.equation_holds ? 'CUADRADO' : 'ROTO' }}
        </div>
      </section>

      <div class="grid">
        <section class="card">
          <div class="eyebrow">Usuarios · {{ d.users.length }}</div>
          <table>
            <thead>
              <tr><th>Email</th><th>Nombre</th><th>Rol</th><th>Estado</th></tr>
            </thead>
            <tbody>
              @for (u of d.users; track u.id) {
                <tr>
                  <td>{{ u.email }}</td>
                  <td>{{ u.full_name }}</td>
                  <td>
                    <span class="chip">{{ u.role }}</span>
                    @if (u.is_platform_admin) {
                      <span class="chip admin">super-admin</span>
                    }
                  </td>
                  <td>
                    <span class="estado" [class.rev]="!u.is_active">
                      {{ u.is_active ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>

        <section class="card">
          <div class="eyebrow">Hallazgos abiertos · {{ d.open_findings.length }}</div>
          @if (d.open_findings.length === 0) {
            <p class="vacio">Sin hallazgos abiertos. Todo limpio.</p>
          } @else {
            <table>
              <thead>
                <tr><th>Severidad</th><th>Check</th><th>Título</th><th>Fecha</th></tr>
              </thead>
              <tbody>
                @for (f of d.open_findings; track f.id) {
                  <tr>
                    <td><span class="sev sev-{{ f.severity }}">{{ f.severity.toUpperCase() }}</span></td>
                    <td><span class="chip">{{ f.check_id }}</span></td>
                    <td>{{ f.title }}</td>
                    <td class="cifra">{{ f.created_at.slice(0, 10) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      </div>
    } @else {
      <section class="card error-card">Tenant no encontrado.</section>
    }
  `,
  styles: [`
    .titulo { margin-bottom: 24px; }
    .tenue { color: var(--papel-tenue); }
    .volver {
      display: inline-block;
      margin-bottom: 16px;
      font-size: 13px;
      color: var(--papel-tenue);
      text-decoration: none;
    }
    .volver:hover { color: var(--laton); }
    .sello {
      position: relative;
      border: 1px solid var(--cuadrado);
      border-radius: var(--radio);
      background: var(--superficie);
      padding: 24px 28px;
      margin-bottom: 28px;
      overflow: hidden;
    }
    .sello.roto { border-color: var(--roto); }
    .resumen { display: flex; gap: 40px; flex-wrap: wrap; }
    .dato { display: flex; flex-direction: column; gap: 4px; }
    .etiqueta {
      font-size: 11px; text-transform: uppercase;
      letter-spacing: 0.12em; color: var(--papel-tenue);
    }
    .valor { font-size: 20px; }
    .estampa {
      position: absolute; top: 18px; right: 20px;
      font-family: var(--f-cifras);
      font-size: 13px; font-weight: 600;
      letter-spacing: 0.2em;
      padding: 6px 14px;
      border: 1.5px solid var(--roto);
      color: var(--roto);
      border-radius: 3px;
      transform: rotate(4deg);
    }
    .estampa.ok { border-color: var(--cuadrado); color: var(--cuadrado); }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    .chip {
      font-family: var(--f-cifras); font-size: 11px;
      border: 1px solid var(--linea); border-radius: 3px; padding: 2px 8px;
      margin-right: 4px;
    }
    .chip.admin { color: var(--laton); border-color: var(--laton); }
    .estado { font-family: var(--f-cifras); font-size: 12px; color: var(--cuadrado); }
    .estado.rev { color: var(--roto); }
    .sev {
      font-family: var(--f-cifras); font-size: 11px; font-weight: 600;
      letter-spacing: 0.06em; padding: 2px 8px; border-radius: 3px;
    }
    .sev-critical { color: var(--roto); border: 1px solid var(--roto); }
    .sev-warning { color: var(--laton); border: 1px solid var(--laton); }
    .sev-info { color: var(--papel-tenue); border: 1px solid var(--linea); }
    .vacio { color: var(--papel-tenue); font-size: 14px; }
    .error-card { border-color: var(--roto); color: var(--papel-tenue); }
  `],
})
export class AdminTenantDetailComponent {
  private api = inject(KontiaApi);
  private route = inject(ActivatedRoute);

  detalle = signal<AdminTenantDetail | null>(null);
  cargando = signal(true);

  constructor() {
    const tenantId = this.route.snapshot.paramMap.get('id');
    if (!tenantId) {
      this.cargando.set(false);
      return;
    }
    this.api
      .adminTenantDetail(tenantId)
      .then((d) => this.detalle.set(d))
      .finally(() => this.cargando.set(false));
  }

  fmt(v: string): string {
    const n = parseFloat(v);
    return (isNaN(n) ? 0 : n).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }
}