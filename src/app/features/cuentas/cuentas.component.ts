import { Component, inject, signal } from '@angular/core';
import { AccountNode, KontiaApi } from '../../core/services/kontia-api.service';

@Component({
  selector: 'app-cuentas',
  standalone: true,
  template: `
    <div class="eyebrow">Plan de cuentas · template vertex_llc_us</div>
    <h1 class="titulo">Cuentas</h1>

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
  `],
})
export class CuentasComponent {
  private api = inject(KontiaApi);
  cuentas = signal<AccountNode[]>([]);
  cargando = signal(true);

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
}