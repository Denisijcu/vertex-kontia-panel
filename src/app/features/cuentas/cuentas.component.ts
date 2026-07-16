import { Component, inject, signal } from '@angular/core';
import { AccountNode, KontiaApi } from '../../core/services/kontia-api.service';

@Component({
  selector: 'app-cuentas',
  standalone: true,
  template: `
    <div class="cabecera">
      <div>
        <div class="eyebrow">Plan de cuentas · template vertex_llc_us</div>
        <h1 class="titulo">Cuentas</h1>
      </div>
      <button class="btn-pdf" (click)="descargarBalanzaPdf()" [disabled]="descargandoPdf()">
        {{ descargandoPdf() ? 'Generando…' : 'Descargar Balanza (PDF)' }}
      </button>
    </div>

    @if (cargando()) {
      <section class="card tenue">Cargando el plan…</section>
    } @else {
      <section class="card">
        <table>
          <thead>
            <tr><th>Código</th><th>Cuenta</th><th>Tipo</th><th>Naturaleza</th><th>Posteable</th></tr>
          </thead>
          <tbody>
            @for (a of cuentas(); track a.id) {
              <tr [class.header-cuenta]="!a.is_postable">
                <td class="cifra">{{ a.code }}</td>
                <td [style.padding-left.px]="12 + (a.depth - 1) * 22">
                  {{ a.name }}
                </td>
                <td><span class="chip tipo-{{ a.account_type }}">{{ tipo(a.account_type) }}</span></td>
                <td class="cifra tenue">{{ a.normal_side === 'debit' ? 'deudora' : 'acreedora' }}</td>
                <td class="cifra">{{ a.is_postable ? '✓' : '—' }}</td>
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
    .header-cuenta td { font-weight: 600; color: var(--laton); }
    .chip {
      font-family: var(--f-cifras); font-size: 11px;
      border: 1px solid var(--linea); border-radius: 3px; padding: 2px 8px;
    }
    .tipo-asset { color: var(--cuadrado); }
    .tipo-liability { color: var(--pendiente); }
    .tipo-equity { color: var(--laton); }
    .tipo-income { color: var(--cuadrado); }
    .tipo-expense { color: var(--roto); }
    /* --- Botón de descarga de PDF (punto 15) --- */
    .cabecera {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .btn-pdf {
      font-size: 12px;
      padding: 7px 14px;
      border-radius: var(--radio);
      border: 1px solid var(--linea);
      background: var(--superficie-2);
      color: var(--papel);
      cursor: pointer;
      white-space: nowrap;
      margin-top: 2px;
    }
    .btn-pdf:hover { border-color: var(--laton); color: var(--laton); }
    .btn-pdf:disabled { opacity: 0.5; cursor: default; }
  `],
})
export class CuentasComponent {
  private api = inject(KontiaApi);
  cuentas = signal<AccountNode[]>([]);
  cargando = signal(true);
  descargandoPdf = signal(false);

  constructor() {
    this.api.accounts()
      .then((c) => this.cuentas.set(c))
      .finally(() => this.cargando.set(false));
  }

  tipo(t: string): string {
    const m: Record<string, string> = {
      asset: 'activo', liability: 'pasivo', equity: 'patrimonio',
      income: 'ingreso', expense: 'gasto',
    };
    return m[t] ?? t;
  }

  async descargarBalanzaPdf() {
    this.descargandoPdf.set(true);
    try {
      // Sin date_from/date_to: balanza histórica completa.
      await this.api.trialBalancePdf();
    } finally {
      this.descargandoPdf.set(false);
    }
  }
}