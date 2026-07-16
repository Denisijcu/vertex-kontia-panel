import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ClassifyResponse,
  KontiaApi,
  Proposal,
} from '../../core/services/kontia-api.service';
import { StatusService } from '../../core/services/status.service';

import { NlQueryComponent } from './nl-query.component';

@Component({
  selector: 'app-agente',
  standalone: true,
  imports: [FormsModule, NlQueryComponent],
  template: `
    <div class="eyebrow">Clasificación con Claude · umbral auto-post {{ umbral() }}%</div>
    <h1 class="titulo">Agente</h1>

    <!-- ============ CAPTURA ============ -->
    <section class="card captura">
      <label for="tx">Describe la transacción como se la contarías a tu contador</label>
      <textarea
        id="tx"
        rows="2"
        [(ngModel)]="texto"
        [disabled]="clasificando()"
        placeholder="Pagué 47.32 de Railway con la tarjeta"
        (keydown.control.enter)="clasificar()"
      ></textarea>
      <div class="acciones">
        <button class="primaria" (click)="clasificar()" [disabled]="clasificando() || texto.trim().length < 3">
          {{ clasificando() ? 'Clasificando…' : 'Clasificar y postear' }}
        </button>
        <span class="hint">Ctrl+Enter</span>
      </div>
    </section>

    <!-- ============ RESULTADO ============ -->
    @if (resultado(); as r) {
      <section
        class="card resultado"
        [class.posteado]="r.posted_entry"
        [class.pendiente]="!r.posted_entry"
      >
        <div class="resultado-cabecera">
          <span class="badge" [class.ok]="r.posted_entry">
            {{ r.posted_entry ? 'POSTEADO' : estadoPendiente(r) }}
          </span>
          <span class="confianza cifra">
            confianza {{ pct(+r.proposal.confidence) }}%
          </span>
        </div>

        @if (r.proposal.proposal.classifiable) {
          <p class="descripcion">{{ r.proposal.proposal.description }}</p>
          <table>
            <thead>
              <tr><th>Cuenta</th><th class="cifra">Debe</th><th class="cifra">Haber</th></tr>
            </thead>
            <tbody>
              @for (l of r.proposal.proposal.lines; track l.account_code) {
                <tr>
                  <td>{{ l.account_code }}</td>
                  <td class="cifra">{{ monto(l.debit) }}</td>
                  <td class="cifra">{{ monto(l.credit) }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
        <p class="razonamiento">{{ r.proposal.reasoning }}</p>
        @if (r.posted_entry; as e) {
          <p class="hash cifra">
            Asiento #{{ e.entry_no }} · sellado {{ e.entry_hash?.slice(0, 16) }}…
          </p>
        }
      </section>
    }
    @if (errorMsg(); as msg) {
      <section class="card error-card">{{ msg }}</section>
    }

    <!-- ============ COLA DE REVISIÓN ============ -->
    <section class="card cola">
      <div class="eyebrow">Cola de revisión · {{ pendientes().length }} pendiente(s)</div>
      @if (pendientes().length === 0) {
        <p class="vacio">
          Nada que revisar. Todo lo clasificado superó el umbral de confianza.
        </p>
      } @else {
        @for (p of pendientes(); track p.id) {
          <div class="propuesta">
            <div class="propuesta-info">
              <span class="raw">"{{ p.raw_input }}"</span>
              <span class="meta cifra">
                confianza {{ pct(+p.confidence) }}% · {{ p.proposal.description || 'no clasificable' }}
              </span>
              <span class="meta">{{ p.reasoning }}</span>
            </div>
            <div class="propuesta-acciones">
              @if (rechazandoId() === p.id) {
                <input
                  [(ngModel)]="razonRechazo"
                  placeholder="Razón del rechazo"
                  (keydown.enter)="confirmarRechazo(p)"
                />
                <button (click)="confirmarRechazo(p)" [disabled]="razonRechazo.trim().length < 3">
                  Confirmar
                </button>
                <button (click)="rechazandoId.set(null)">Cancelar</button>
              } @else {
                @if (p.proposal.classifiable) {
                  <button class="primaria" (click)="aprobar(p)">Aprobar y postear</button>
                }
                <button (click)="rechazandoId.set(p.id); razonRechazo = ''">Rechazar</button>
              }
            </div>
          </div>
        }
      }
    </section>
    <app-nl-query />
  `,
  styles: [
    `
      .titulo { margin-bottom: 24px; }
      .captura { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
      .captura label { font-size: 13px; color: var(--papel-tenue); }
      .acciones { display: flex; align-items: center; gap: 12px; }
      .hint { font-size: 12px; color: var(--papel-tenue); font-family: var(--f-cifras); }
      .resultado { margin-bottom: 20px; border-left: 3px solid var(--pendiente); }
      .resultado.posteado { border-left-color: var(--cuadrado); }
      .resultado-cabecera {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 12px;
      }
      .badge {
        font-family: var(--f-cifras); font-size: 12px; font-weight: 600;
        letter-spacing: 0.15em; padding: 4px 10px; border-radius: 3px;
        border: 1px solid var(--pendiente); color: var(--pendiente);
      }
      .badge.ok { border-color: var(--cuadrado); color: var(--cuadrado); }
      .confianza { font-size: 13px; color: var(--papel-tenue); }
      .descripcion { margin-bottom: 10px; }
      .razonamiento { margin-top: 12px; font-size: 13px; color: var(--papel-tenue); font-style: italic; }
      .hash { margin-top: 10px; font-size: 12px; color: var(--laton); text-align: left; }
      .error-card { border-color: var(--roto); margin-bottom: 20px; }
      .cola .vacio { color: var(--papel-tenue); font-size: 14px; }
      .propuesta {
        display: flex; justify-content: space-between; gap: 16px;
        padding: 14px 0; border-bottom: 1px solid var(--linea);
        align-items: center; flex-wrap: wrap;
      }
      .propuesta:last-child { border-bottom: none; }
      .propuesta-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
      .raw { font-weight: 500; }
      .meta { font-size: 12px; color: var(--papel-tenue); text-align: left; }
      .propuesta-acciones { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
      .propuesta-acciones input { width: 220px; padding: 7px 10px; font-size: 13px; }
    `,
  ],
})
export class AgenteComponent {
  private api = inject(KontiaApi);
  private status = inject(StatusService);

  texto = '';
  razonRechazo = '';

  clasificando = signal(false);
  resultado = signal<ClassifyResponse | null>(null);
  errorMsg = signal<string | null>(null);
  pendientes = signal<Proposal[]>([]);
  rechazandoId = signal<string | null>(null);
  umbral = signal(90);

  constructor() {
    this.cargarPendientes();
     const prefill = sessionStorage.getItem('agente_prefill');
    if (prefill) {
      this.texto = prefill;
      sessionStorage.removeItem('agente_prefill');
    }
  }

  async clasificar() {
    if (this.texto.trim().length < 3 || this.clasificando()) return;
    this.clasificando.set(true);
    this.errorMsg.set(null);
    this.resultado.set(null);
    try {
      const r = await this.api.classify(this.texto.trim());
      this.resultado.set(r);
      this.umbral.set(Math.round(r.threshold * 100));
      this.texto = '';
      await this.cargarPendientes();
      if (r.posted_entry) {
        // El ledger cambió: el chrome (Ecuación Viva + cadena) se re-verifica.
        this.status.refresh();
      }
    } catch (e: any) {
      this.errorMsg.set(
        e?.error?.detail ?? 'El agente no respondió. Revisa ANTHROPIC_API_KEY en el backend.'
      );
    } finally {
      this.clasificando.set(false);
    }
  }

  async aprobar(p: Proposal) {
    try {
      await this.api.approveProposal(p.id);
      await this.cargarPendientes();
      // Aprobar siempre postea: refresh del chrome.
      this.status.refresh();
    } catch (e: any) {
      this.errorMsg.set(e?.error?.detail ?? 'No se pudo aprobar.');
    }
  }

  async confirmarRechazo(p: Proposal) {
    if (this.razonRechazo.trim().length < 3) return;
    try {
      await this.api.rejectProposal(p.id, this.razonRechazo.trim());
      this.rechazandoId.set(null);
      await this.cargarPendientes();
    } catch (e: any) {
      this.errorMsg.set(e?.error?.detail ?? 'No se pudo rechazar.');
    }
  }

  private async cargarPendientes() {
    try {
      this.pendientes.set(await this.api.proposals('pending'));
    } catch {
      /* backend caído: la cola queda vacía sin romper la pantalla */
    }
  }

  estadoPendiente(r: ClassifyResponse): string {
    return r.proposal.proposal.classifiable ? 'A REVISIÓN' : 'NO CLASIFICABLE';
  }

  pct(v: number): number {
    return Math.round(v * 100);
  }

  monto(v: string): string {
    const n = parseFloat(v);
    return n > 0
      ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
      : '—';
  }
}