import { Component, inject, signal } from '@angular/core';
import { KontiaApi, NLQueryResponse } from '../../core/services/kontia-api.service';

@Component({
  selector: 'app-nl-query',
  standalone: true,
  template: `
    <section class="card consulta">
      <div class="eyebrow">Pregúntale al libro mayor</div>

      <div class="captura-nl">
        <input
          type="text"
          placeholder="¿Cuánto hay en el banco? · ¿Qué compré en Amazon? · ¿Mis 5 gastos más grandes?"
          [value]="pregunta()"
          (input)="pregunta.set($any($event.target).value)"
          (keydown.enter)="preguntar()"
          [disabled]="cargando()"
        />
        <button class="primaria" (click)="preguntar()" [disabled]="cargando() || pregunta().trim().length < 3">
          {{ cargando() ? 'Consultando…' : 'Preguntar' }}
        </button>
      </div>

      @if (error(); as e) {
        <p class="nl-error">{{ e }}</p>
      }

      @if (resultado(); as r) {
        <div class="respuesta">
          @if (!r.answerable) {
            <p class="nl-rechazo">{{ r.message }}</p>
            @if (r.reasoning) {
              <p class="nl-razon">{{ r.reasoning }}</p>
            }
          } @else {
            @switch (r.query_id) {

              @case ('account_balance') {
                <div class="dato-grande">
                  <span class="cifra valor-nl">{{ fmt(r.data.balance) }}</span>
                  <span class="detalle-nl">
                    {{ r.data.account_code }} · {{ r.data.account_name }}
                    al {{ r.data.as_of }}
                  </span>
                </div>
              }

              @case ('expense_by_account') {
                <div class="dato-grande">
                  <span class="cifra valor-nl">{{ fmt(r.data.net_amount) }}</span>
                  <span class="detalle-nl">
                    {{ r.data.account_code }} · {{ r.data.account_name }}
                    · {{ rango(r.data.date_from, r.data.date_to) }}
                  </span>
                </div>
              }

              @case ('expense_by_project') {
                <div class="dato-grande">
                  <span class="cifra valor-nl">{{ fmt(r.data.total_expense) }}</span>
                  <span class="detalle-nl">
                    Proyecto {{ r.data.cost_center }}
                    · {{ rango(r.data.date_from, r.data.date_to) }}
                  </span>
                </div>
              }

              @case ('period_summary') {
                <table>
                  <tbody>
                    <tr><td>Ingresos</td><td class="cifra">{{ fmt(r.data.total_income) }}</td></tr>
                    <tr><td>Gastos</td><td class="cifra">({{ fmt(r.data.total_expenses) }})</td></tr>
                    <tr class="total">
                      <td>Resultado neto · {{ rango(r.data.date_from, r.data.date_to) }}</td>
                      <td class="cifra">{{ fmt(r.data.net_income) }}</td>
                    </tr>
                  </tbody>
                </table>
              }

              @case ('entries_search') {
                @if (r.data.matches.length > 0) {
                  <table>
                    <thead>
                      <tr><th>Folio</th><th>Fecha</th><th>Descripción</th><th>Estado</th></tr>
                    </thead>
                    <tbody>
                      @for (m of r.data.matches; track m.entry_no) {
                        <tr>
                          <td class="cifra">#{{ m.entry_no }}</td>
                          <td>{{ m.entry_date }}</td>
                          <td>{{ m.description }}</td>
                          <td [class.nl-reversed]="m.status === 'reversed'">{{ m.status }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                } @else {
                  <p class="nl-vacio">Sin asientos que mencionen "{{ r.data.text }}".</p>
                }
              }

              @case ('largest_expenses') {
                @if (r.data.expenses.length > 0) {
                  <table>
                    <thead>
                      <tr><th>Folio</th><th>Cuenta</th><th>Descripción</th><th class="cifra">Monto</th></tr>
                    </thead>
                    <tbody>
                      @for (g of r.data.expenses; track $index) {
                        <tr>
                          <td class="cifra">#{{ g.entry_no }}</td>
                          <td>{{ g.account_code }} · {{ g.account_name }}</td>
                          <td>{{ g.description }}</td>
                          <td class="cifra">{{ fmt(g.amount) }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                } @else {
                  <p class="nl-vacio">Sin gastos en el rango.</p>
                }
              }

              @default {
                <p class="nl-vacio">Respuesta recibida ({{ r.query_id }}) — render pendiente.</p>
              }
            }
            <p class="nl-meta">
              {{ r.query_id }} · confianza {{ (r.confidence * 100).toFixed(0) }}%
            </p>
          }
        </div>
      }

      
    </section>
  `,
  styles: [
    `
      .consulta { margin-bottom: 20px; }
      .captura-nl { display: flex; gap: 10px; }
      .captura-nl input { flex: 1; }
      .respuesta { margin-top: 16px; }
      .dato-grande { display: flex; flex-direction: column; gap: 4px; }
      .valor-nl {
        font-size: 30px;
        text-align: left;
        color: var(--laton);
      }
      .detalle-nl { font-size: 13px; color: var(--papel-tenue); }
      .nl-error { margin-top: 12px; color: var(--roto); font-size: 13px; }
      .nl-rechazo { color: var(--pendiente); font-size: 14px; }
      .nl-razon { margin-top: 6px; color: var(--papel-tenue); font-size: 13px; }
      .nl-vacio { color: var(--papel-tenue); font-size: 14px; }
      .nl-reversed { color: var(--pendiente); }
      .nl-meta {
        margin-top: 10px;
        font-family: var(--f-cifras);
        font-size: 11px;
        color: var(--papel-tenue);
      }
      tr.total td {
        font-weight: 600;
        border-top: 2px solid var(--linea);
      }
      @media (max-width: 800px) {
        .captura-nl { flex-direction: column; }
        .valor-nl { font-size: 24px; }
      }
    `,
  ],
})
export class NlQueryComponent {
  private api = inject(KontiaApi);

  pregunta = signal('');
  cargando = signal(false);
  resultado = signal<NLQueryResponse | null>(null);
  error = signal<string | null>(null);

  async preguntar(): Promise<void> {
    const q = this.pregunta().trim();
    if (q.length < 3 || this.cargando()) return;

    this.cargando.set(true);
    this.error.set(null);
    this.resultado.set(null);
    try {
      this.resultado.set(await this.api.nlQuery(q));
    } catch (e: any) {
      this.error.set(e?.error?.detail ?? e?.message ?? 'Error consultando el ledger.');
    } finally {
      this.cargando.set(false);
    }
  }

  fmt(v: number): string {
    return (typeof v === 'number' && !isNaN(v) ? v : 0).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }

  rango(from: string | null, to: string | null): string {
    if (from && to) return `${from} → ${to}`;
    if (from) return `desde ${from}`;
    if (to) return `hasta ${to}`;
    return 'todo el historial';
  }
}