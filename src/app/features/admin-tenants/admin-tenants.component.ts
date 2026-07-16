import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AdminTenantOverview,
  KontiaApi,
  OnboardingTemplate,
  RegisterTenantResult,
} from '../../core/services/kontia-api.service';

@Component({
  selector: 'app-admin-tenants',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="eyebrow">Panel de administracion de plataforma - God mode</div>
    <h1 class="titulo">Tenants</h1>

    <!-- ============ CREAR TENANT ============ -->
    <section class="card form-crear">
      <div class="eyebrow">Crear tenant nuevo</div>
      <p class="tenue">
        Usa el mismo flujo de onboarding self-service -- empresa, plan de cuentas,
        periodos del ano fiscal, y usuario owner, todo en una transaccion.
      </p>
      <div class="grid-form">
        <input
          type="text"
          placeholder="Nombre de la empresa"
          [(ngModel)]="companyName"
          name="companyName"
        />
        <select [(ngModel)]="templateId" name="templateId">
          <option value="" disabled>-- Plan de cuentas --</option>
          @for (t of templates(); track t.template_id) {
            <option [value]="t.template_id">
              {{ t.name }} ({{ t.currency }} - {{ t.accounts_count }} cuentas)
            </option>
          }
        </select>
        <input
          type="text"
          placeholder="Moneda base (ISO, ej. USD)"
          [(ngModel)]="baseCurrency"
          name="baseCurrency"
          maxlength="3"
        />
        <input
          type="number"
          placeholder="Ano fiscal (opcional)"
          [(ngModel)]="fiscalYear"
          name="fiscalYear"
        />
        <input
          type="email"
          placeholder="Email del owner"
          [(ngModel)]="ownerEmail"
          name="ownerEmail"
        />
        <input
          type="text"
          placeholder="Nombre del owner"
          [(ngModel)]="ownerFullName"
          name="ownerFullName"
        />
        <input
          type="password"
          placeholder="Contrasena del owner (min. 8)"
          [(ngModel)]="ownerPassword"
          name="ownerPassword"
        />
        <button (click)="crearTenant()" [disabled]="creando()">
          {{ creando() ? 'Creando...' : 'Crear tenant' }}
        </button>
      </div>
      @if (errorCrear()) {
        <p class="error">{{ errorCrear() }}</p>
      }
      @if (resultadoCreado(); as r) {
        <div class="resultado-creado">
          Tenant <b>{{ r.company }}</b> creado - plan {{ r.template }} -
          {{ r.accounts_created }} cuentas - owner {{ r.owner_email }} -
          <a (click)="verDetalle(r.tenant_id)">ver detalle</a>
        </div>
      }
    </section>

    @if (cargando()) {
      <section class="card tenue">Consultando todos los tenants...</section>
    } @else if (tenants().length === 0) {
      <section class="card tenue">No hay tenants todavia.</section>
    } @else {
      <section class="card">
        <table>
          <thead>
            <tr>
              <th>Empresa</th><th>Moneda</th><th class="cifra">Usuarios</th>
              <th class="cifra">Asientos</th><th>Ultima actividad</th>
              <th class="cifra">Hallazgos abiertos</th>
            </tr>
          </thead>
          <tbody>
            @for (t of tenants(); track t.tenant_id) {
              <tr class="fila" (click)="verDetalle(t.tenant_id)">
                <td>{{ t.name }}</td>
                <td class="cifra tenue">{{ t.base_currency }}</td>
                <td class="cifra">{{ t.user_count }}</td>
                <td class="cifra">{{ t.entry_count }}</td>
                <td class="cifra tenue">{{ formatFecha(t.last_activity) }}</td>
                <td class="cifra">
                  <span
                    class="hallazgos"
                    [class.critico]="t.open_critical_findings > 0"
                  >
                    {{ t.open_findings }}
                    @if (t.open_critical_findings > 0) {
                      <span class="badge-critico">{{ t.open_critical_findings }} critico(s)</span>
                    }
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    }
  `,
  styles: [`
    .titulo { margin-bottom: 24px; }
    .tenue { color: var(--papel-tenue); }
    .fila { cursor: pointer; }
    .fila:hover { background: var(--superficie-2); }
    .hallazgos { display: inline-flex; align-items: center; gap: 6px; }
    .hallazgos.critico { color: var(--roto); font-weight: 600; }
    .badge-critico {
      font-family: var(--f-cifras);
      font-size: 10px;
      font-weight: 600;
      color: var(--roto);
      border: 1px solid var(--roto);
      border-radius: 3px;
      padding: 1px 6px;
    }
    /* --- Crear tenant --- */
    .form-crear { margin-bottom: 20px; }
    .grid-form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
      margin-top: 12px;
      align-items: center;
    }
    .grid-form input, .grid-form select {
      background: var(--superficie-2);
      border: 1px solid var(--linea);
      border-radius: var(--radio);
      color: var(--papel);
      padding: 8px 10px;
      font-size: 13px;
    }
    .grid-form button {
      padding: 8px 16px;
      border-radius: var(--radio);
      border: 1px solid var(--laton);
      background: var(--laton);
      color: var(--tinta);
      font-weight: 600;
      cursor: pointer;
    }
    .grid-form button:disabled { opacity: 0.5; cursor: default; }
    .error { color: var(--roto); font-size: 13px; margin-top: 10px; }
    .resultado-creado {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--linea);
      font-size: 13px;
      color: var(--cuadrado);
    }
    .resultado-creado a { color: var(--laton); cursor: pointer; text-decoration: underline; }
  `],
})
export class AdminTenantsComponent {
  private api = inject(KontiaApi);
  private router = inject(Router);

  tenants = signal<AdminTenantOverview[]>([]);
  templates = signal<OnboardingTemplate[]>([]);
  cargando = signal(true);
  creando = signal(false);
  errorCrear = signal<string | null>(null);
  resultadoCreado = signal<RegisterTenantResult | null>(null);

  companyName = '';
  templateId = '';
  baseCurrency = 'USD';
  fiscalYear: number | null = null;
  ownerEmail = '';
  ownerFullName = '';
  ownerPassword = '';

  constructor() {
    this.cargar();
    this.api.onboardingTemplates().then((t) => this.templates.set(t));
  }

  private cargar() {
    this.cargando.set(true);
    this.api
      .adminTenants()
      .then((t) => this.tenants.set(t))
      .finally(() => this.cargando.set(false));
  }

  async crearTenant() {
    if (!this.companyName || !this.templateId || !this.ownerEmail ||
        !this.ownerFullName || this.ownerPassword.length < 8) {
      this.errorCrear.set('Completa empresa, plan de cuentas, y los datos del owner (contrasena min. 8).');
      return;
    }
    this.creando.set(true);
    this.errorCrear.set(null);
    this.resultadoCreado.set(null);
    try {
      const resultado = await this.api.registerTenant({
        company_name: this.companyName,
        template_id: this.templateId,
        base_currency: this.baseCurrency || 'USD',
        fiscal_year: this.fiscalYear,
        owner_email: this.ownerEmail,
        owner_password: this.ownerPassword,
        owner_full_name: this.ownerFullName,
      });
      this.resultadoCreado.set(resultado);
      this.companyName = '';
      this.templateId = '';
      this.ownerEmail = '';
      this.ownerFullName = '';
      this.ownerPassword = '';
      this.fiscalYear = null;
      this.cargar();
    } catch (e: any) {
      this.errorCrear.set(e?.error?.detail ?? 'No se pudo crear el tenant.');
    } finally {
      this.creando.set(false);
    }
  }

  verDetalle(tenantId: string) {
    this.router.navigate(['/admin/tenants', tenantId]);
  }

  formatFecha(iso: string | null): string {
    if (!iso) return 'sin actividad';
    return iso.slice(0, 10);
  }
}