import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import {
  BalanceSheet,
  ExpensesByActivity,
  IncomeStatement,
  KontiaApi,
} from '../../core/services/kontia-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="eyebrow">{{ auth.user()?.tenant_name ?? 'Kontia' }} · {{ hoy }}</div>
    <h1 class="titulo">Dashboard</h1>

    <!-- ============ EL SELLO DE CUADRE ============ -->
    @if (balance(); as b) {
      <section class="sello" [class.roto]="!b.equation_holds">
        <div class="ecuacion display">
          <span class="termino">
            <span class="letra">A</span>
            <span class="cifra valor">{{ fmt(b.total_assets) }}</span>
            <span class="etiqueta">Activo</span>
          </span>
          <span class="signo">=</span>
          <span class="termino">
            <span class="letra">P</span>
            <span class="cifra valor">{{ fmt(b.total_liabilities) }}</span>
            <span class="etiqueta">Pasivo</span>
          </span>
          <span class="signo">+</span>
          <span class="termino">
            <span class="letra">PN</span>
            <span class="cifra valor">{{ fmt(b.total_equity) }}</span>
            <span class="etiqueta">Patrimonio</span>
          </span>
        </div>
        <div class="estampa" [class.ok]="b.equation_holds">
          {{ b.equation_holds ? 'CUADRADO' : 'ROTO' }}
        </div>
      </section>
    } @else if (error()) {
      <section class="card error-card">
        No se pudo cargar el balance. ¿El backend está corriendo en el puerto 8000?
        <span class="cifra">{{ error() }}</span>
      </section>
    } @else {
      <section class="card cargando">Consultando el libro mayor…</section>
    }

    <!-- ============ BALANCE + RESULTADOS ============ -->
    <div class="grid">
      @if (balance(); as b) {
        <section class="card">
          <div class="cabecera-reporte">
            <div class="eyebrow">Balance general al {{ b.as_of }}</div>
            <button
              class="btn-pdf"
              (click)="descargarBalancePdf()"
              [disabled]="descargandoBalance()"
            >
              {{ descargandoBalance() ? 'Generando…' : 'Descargar PDF' }}
            </button>
          </div>
          <table>
            <thead>
              <tr><th>Cuenta</th><th class="cifra">Saldo</th></tr>
            </thead>
            <tbody>
              @for (a of b.assets; track a.code) {
                <tr>
                  <td>{{ a.code }} · {{ a.name }}</td>
                  <td class="cifra">{{ fmt(a.balance) }}</td>
                </tr>
              }
              <tr class="total">
                <td>Total activos</td>
                <td class="cifra">{{ fmt(b.total_assets) }}</td>
              </tr>
              @for (p of b.liabilities; track p.code) {
                <tr>
                  <td>{{ p.code }} · {{ p.name }}</td>
                  <td class="cifra">{{ fmt(p.balance) }}</td>
                </tr>
              }
              @for (e of b.equity; track e.code) {
                <tr>
                  <td>{{ e.code }} · {{ e.name }}</td>
                  <td class="cifra">{{ fmt(e.balance) }}</td>
                </tr>
              }
              <tr>
                <td>Resultado del período</td>
                <td class="cifra">{{ fmt(b.net_income_to_date) }}</td>
              </tr>
              <tr class="total">
                <td>Total pasivo + patrimonio</td>
                <td class="cifra">
                  {{ fmt(suma(b.total_liabilities, b.total_equity)) }}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      }

      @if (resultados(); as r) {
        <section class="card">
          <div class="eyebrow">Estado de resultados · {{ r.date_from }} → {{ r.date_to }}</div>
          <table>
            <thead>
              <tr><th>Concepto</th><th class="cifra">Monto</th></tr>
            </thead>
            <tbody>
              @for (i of r.income; track i.code) {
                <tr>
                  <td>{{ i.code }} · {{ i.name }}</td>
                  <td class="cifra">{{ fmt(i.balance) }}</td>
                </tr>
              }
              <tr class="total">
                <td>Total ingresos</td>
                <td class="cifra">{{ fmt(r.total_income) }}</td>
              </tr>
              @for (g of r.expenses; track g.code) {
                <tr>
                  <td>{{ g.code }} · {{ g.name }}</td>
                  <td class="cifra">({{ fmt(g.balance) }})</td>
                </tr>
              }
              <tr class="total">
                <td>Total gastos</td>
                <td class="cifra">({{ fmt(r.total_expenses) }})</td>
              </tr>
              <tr class="total resultado" [class.negativo]="esNegativo(r.net_income)">
                <td>Resultado neto</td>
                <td class="cifra">{{ fmt(r.net_income) }}</td>
              </tr>
            </tbody>
          </table>
          @if (r.income.length === 0 && r.expenses.length === 0) {
            <p class="vacio">
              Sin movimientos de resultados este año. Postea tu primer gasto
              desde la pantalla del Agente.
            </p>
          }
        </section>
      }

      <!-- ============ GASTOS POR PROYECTO ============ -->
      @if (gastos(); as g) {
        <section class="card">
          <div class="eyebrow">Gastos por proyecto · {{ inicioAno }} → {{ hoy }}</div>
          @for (a of g.activities; track a.activity) {
            <div class="proyecto">
              <div class="proyecto-fila">
                <span class="proyecto-nombre">{{ a.activity }}</span>
                <span class="cifra proyecto-pct">{{ pct(a.total, g.grand_total) }}%</span>
                <span class="cifra proyecto-monto">{{ fmt(a.total) }}</span>
              </div>
              <div class="pista">
                <div
                  class="relleno"
                  [style.width.%]="pct(a.total, g.grand_total)"
                ></div>
              </div>
            </div>
          }
          @if (g.activities.length > 0) {
            <div class="proyecto-fila proyecto-gran-total">
              <span class="proyecto-nombre">Total</span>
              <span class="cifra proyecto-monto">{{ fmt(g.grand_total) }}</span>
            </div>
          } @else {
            <p class="vacio">
              Sin gastos registrados en el período. Postea tu primer gasto
              desde la pantalla del Agente.
            </p>
          }
        </section>
      }
    </div>
  `,
  styles: [
    `
      .titulo { margin-bottom: 24px; }
      /* --- El Sello de Cuadre --- */
      .sello {
        position: relative;
        border: 1px solid var(--cuadrado);
        border-radius: var(--radio);
        background: var(--superficie);
        padding: 32px 28px;
        margin-bottom: 28px;
        overflow: hidden;
      }
      .sello.roto { border-color: var(--roto); }
      .ecuacion {
        display: flex;
        align-items: baseline;
        gap: 20px;
        flex-wrap: wrap;
      }
      .termino { display: flex; flex-direction: column; gap: 2px; }
      .letra { font-size: 15px; color: var(--laton); font-style: italic; }
      .valor { font-size: 28px; text-align: left; }
      .etiqueta {
        font-size: 11px; text-transform: uppercase;
        letter-spacing: 0.12em; color: var(--papel-tenue);
      }
      .signo { font-size: 32px; color: var(--laton); }
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
      /* --- Grid de reportes --- */
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
      tr.total td {
        font-weight: 600;
        border-top: 2px solid var(--linea);
        border-bottom: 2px solid var(--linea);
      }
      tr.resultado td { color: var(--cuadrado); }
      tr.resultado.negativo td { color: var(--roto); }
      .vacio { margin-top: 14px; color: var(--papel-tenue); font-size: 14px; }
      .cargando, .error-card { margin-bottom: 28px; color: var(--papel-tenue); }
      .error-card { border-color: var(--roto); }
      /* --- Gastos por proyecto (barras horizontales) --- */
      .proyecto { margin-bottom: 14px; }
      .proyecto-fila {
        display: flex;
        align-items: baseline;
        gap: 10px;
        margin-bottom: 5px;
      }
      .proyecto-nombre {
        flex: 1;
        font-size: 13px;
        letter-spacing: 0.04em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .proyecto-pct {
        font-size: 12px;
        color: var(--papel-tenue);
        min-width: 48px;
      }
      .proyecto-monto { font-size: 14px; min-width: 90px; }
      .pista {
        height: 8px;
        background: var(--superficie-2);
        border-radius: 4px;
        overflow: hidden;
      }
      .relleno {
        height: 100%;
        background: var(--laton);
        border-radius: 4px;
        transition: width 300ms ease;
      }
      .proyecto-gran-total {
        margin-top: 16px;
        padding-top: 12px;
        border-top: 2px solid var(--linea);
        font-weight: 600;
      }
      /* --- Botón de descarga de PDF (punto 15) --- */
      .cabecera-reporte {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 4px;
      }
      .btn-pdf {
        font-size: 12px;
        padding: 6px 12px;
        border-radius: var(--radio);
        border: 1px solid var(--linea);
        background: var(--superficie-2);
        color: var(--papel);
        cursor: pointer;
        white-space: nowrap;
      }
      .btn-pdf:hover { border-color: var(--laton); color: var(--laton); }
      .btn-pdf:disabled { opacity: 0.5; cursor: default; }
    `,
  ],
})
export class DashboardComponent {
  private api = inject(KontiaApi);
  auth = inject(AuthService);

  balance = signal<BalanceSheet | null>(null);
  resultados = signal<IncomeStatement | null>(null);
  gastos = signal<ExpensesByActivity | null>(null);
  error = signal<string | null>(null);
  descargandoBalance = signal(false);

  hoy = new Date().toISOString().slice(0, 10);
  inicioAno = `${new Date().getFullYear()}-01-01`;

  constructor() {
    this.api
      .balanceSheet(this.hoy)
      .then((b) => this.balance.set(b))
      .catch((e) => this.error.set(e?.message ?? 'Error de conexión'));
    this.api
      .incomeStatement(this.inicioAno, this.hoy)
      .then((r) => this.resultados.set(r))
      .catch(() => {});
    this.api
      .expensesByActivity(this.inicioAno, this.hoy)
      .then((g) => this.gastos.set(g))
      .catch(() => {});
  }

  fmt(v: string | number): string {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return (isNaN(n) ? 0 : n).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }

  suma(a: string, b: string): number {
    return parseFloat(a) + parseFloat(b);
  }

  esNegativo(v: string): boolean {
    return parseFloat(v) < 0;
  }

  pct(v: number, total: number): number {
    if (!total || total <= 0) return 0;
    const p = Math.round((v / total) * 1000) / 10;
    return Math.min(100, Math.max(0, p));
  }

  async descargarBalancePdf() {
    this.descargandoBalance.set(true);
    try {
      await this.api.balanceSheetPdf(this.hoy);
    } finally {
      this.descargandoBalance.set(false);
    }
  }
}