import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  KontiaApi,
  MigrationCommitResponse,
  MigrationMapping,
  MigrationSessionDetail,
} from '../../core/services/kontia-api.service';

@Component({
  selector: 'app-migracion-detalle',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <a class="volver" routerLink="/migracion">← Volver a Migración</a>

    @if (cargando()) {
      <section class="card tenue">Consultando sesión…</section>
    } @else if (detalle(); as d) {
      <div class="eyebrow">Sesión de migración · {{ d.status }}</div>
      <h1 class="titulo">{{ d.filename }}</h1>

      <section class="sello" [class.roto]="d.imbalance !== '0.0000' && d.imbalance !== '0'">
        <div class="resumen">
          <div class="dato">
            <span class="etiqueta">Aprobado (Debe)</span>
            <span class="valor cifra">{{ fmt(d.approved_debit) }}</span>
          </div>
          <div class="dato">
            <span class="etiqueta">Aprobado (Haber)</span>
            <span class="valor cifra">{{ fmt(d.approved_credit) }}</span>
          </div>
          <div class="dato">
            <span class="etiqueta">Descuadre</span>
            <span class="valor cifra">{{ fmt(d.imbalance) }}</span>
          </div>
          <div class="dato">
            <span class="etiqueta">Pendientes</span>
            <span class="valor cifra">{{ d.pending_count }} de {{ d.row_count }}</span>
          </div>
        </div>
      </section>

      @if (d.committed_entry_id) {
        <section class="card ok">
          Sesión confirmada — asiento posteado (id {{ d.committed_entry_id }}).
        </section>
      } @else if (d.status === 'discarded') {
        <section class="card tenue">
          Esta sesión fue descartada. No se pueden aprobar, rechazar ni confirmar
          más filas.
        </section>
      } @else {
        <section class="card form-commit">
          <div class="eyebrow">Confirmar importación (postear asiento)</div>
          @if (d.pending_count > 0) {
            <p class="tenue">
              Resuelve las {{ d.pending_count }} filas pendientes antes de confirmar.
            </p>
          }
          <div class="fila-form">
            <input type="date" [(ngModel)]="fechaAsiento" name="fecha" />
            <input
              type="text"
              placeholder="Cuenta de ajuste (solo si hay descuadre)"
              [(ngModel)]="cuentaAjuste"
              name="ajuste"
            />
            <input
              type="text"
              placeholder="Descripción (opcional)"
              [(ngModel)]="descripcionAsiento"
              name="descripcion"
            />
            <button
              (click)="confirmarImportacion()"
              [disabled]="confirmando() || d.pending_count > 0"
            >
              {{ confirmando() ? 'Confirmando…' : 'Confirmar importación' }}
            </button>
          </div>
          @if (errorCommit()) {
            <p class="error">{{ errorCommit() }}</p>
          }
          @if (resultadoCommit(); as r) {
            <div class="resultado-commit">
              Asiento #{{ r.entry_no }} posteado · {{ r.lines_posted }} líneas ·
              ajuste {{ fmt(r.adjustment_amount) }}
            </div>
          }
          <button class="btn-descartar" (click)="descartar()" [disabled]="descartando()">
            {{ descartando() ? 'Descartando…' : 'Descartar sesión' }}
          </button>
        </section>
      }

      <section class="card">
        <table>
          <thead>
            <tr>
              <th>Fila</th><th>Origen</th><th class="cifra">Saldo</th>
              <th>Cuenta propuesta</th><th class="cifra">Confianza</th>
              <th>Estado</th><th>Código final</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (m of d.mappings; track m.id) {
              <tr>
                <td class="cifra">#{{ m.row_no }}</td>
                <td>
                  {{ m.source_code }} {{ m.source_name }}
                </td>
                <td class="cifra">
                  {{ fmt(m.balance) }} ({{ m.side === 'debit' ? 'debe' : 'haber' }})
                </td>
                <td [title]="m.reasoning">
                  {{ m.proposed_code }} {{ m.proposed_name }}
                </td>
                <td class="cifra">{{ pct(m.confidence) }}%</td>
                <td><span class="sev sev-{{ m.status }}">{{ m.status }}</span></td>
                <td>
                  @if ((m.status === 'proposed' || m.status === 'needs_review') && !d.committed_entry_id && d.status !== 'discarded') {
                    <input
                      type="text"
                      class="input-codigo"
                      [(ngModel)]="codigosEditados[m.id]"
                      name="codigo-{{ m.id }}"
                    />
                  } @else {
                    <span class="tenue">{{ m.final_code ?? m.proposed_code ?? '—' }}</span>
                  }
                </td>
                <td class="acciones">
                  @if ((m.status === 'proposed' || m.status === 'needs_review') && !d.committed_entry_id && d.status !== 'discarded') {
                    <button
                      class="btn-accion aprobar"
                      (click)="aprobar(m)"
                      [disabled]="procesando() === m.id"
                    >
                      {{ procesando() === m.id ? '…' : 'Aprobar' }}
                    </button>
                    <button
                      class="btn-accion rechazar"
                      (click)="rechazar(m)"
                      [disabled]="procesando() === m.id"
                    >
                      Rechazar
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    } @else {
      <section class="card error-card">Sesión no encontrada.</section>
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
      margin-bottom: 20px;
    }
    .sello.roto { border-color: var(--pendiente); }
    .resumen { display: flex; gap: 32px; flex-wrap: wrap; }
    .dato { display: flex; flex-direction: column; gap: 4px; }
    .etiqueta {
      font-size: 11px; text-transform: uppercase;
      letter-spacing: 0.1em; color: var(--papel-tenue);
    }
    .valor { font-size: 18px; }
    .card.ok { border-color: var(--cuadrado); color: var(--cuadrado); margin-bottom: 20px; }
    .form-commit { margin-bottom: 20px; }
    .fila-form {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 10px;
    }
    .fila-form input {
      background: var(--superficie-2);
      border: 1px solid var(--linea);
      border-radius: var(--radio);
      color: var(--papel);
      padding: 8px 10px;
      font-size: 13px;
    }
    .fila-form button {
      padding: 8px 16px;
      border-radius: var(--radio);
      border: 1px solid var(--laton);
      background: var(--laton);
      color: var(--tinta);
      font-weight: 600;
      cursor: pointer;
    }
    .fila-form button:disabled { opacity: 0.5; cursor: default; }
    .error { color: var(--roto); font-size: 13px; margin-top: 8px; }
    .resultado-commit {
      margin-top: 10px;
      font-size: 13px;
      color: var(--cuadrado);
    }
    .btn-descartar {
      margin-top: 14px;
      font-size: 12px;
      padding: 6px 12px;
      border-radius: var(--radio);
      border: 1px solid var(--roto);
      background: transparent;
      color: var(--roto);
      cursor: pointer;
    }
    .btn-descartar:hover { background: var(--roto); color: var(--tinta); }
    .btn-descartar:disabled { opacity: 0.5; cursor: default; }
    .sev {
      font-family: var(--f-cifras); font-size: 11px; font-weight: 600;
      letter-spacing: 0.04em; padding: 2px 8px; border-radius: 3px;
    }
    .sev-proposed { color: var(--pendiente); border: 1px solid var(--pendiente); }
    .sev-needs_review { color: var(--laton); border: 1px solid var(--laton); }
    .sev-approved { color: var(--cuadrado); border: 1px solid var(--cuadrado); }
    .sev-rejected { color: var(--roto); border: 1px solid var(--roto); }
    .input-codigo {
      background: var(--superficie-2);
      border: 1px solid var(--linea);
      border-radius: var(--radio);
      color: var(--papel);
      padding: 5px 8px;
      font-size: 12px;
      width: 90px;
    }
    .acciones { display: flex; gap: 6px; }
    .btn-accion {
      font-size: 11px;
      padding: 5px 10px;
      border-radius: var(--radio);
      background: transparent;
      cursor: pointer;
      white-space: nowrap;
    }
    .btn-accion.aprobar { border: 1px solid var(--cuadrado); color: var(--cuadrado); }
    .btn-accion.aprobar:hover { background: var(--cuadrado); color: var(--tinta); }
    .btn-accion.rechazar { border: 1px solid var(--roto); color: var(--roto); }
    .btn-accion.rechazar:hover { background: var(--roto); color: var(--tinta); }
    .btn-accion:disabled { opacity: 0.5; cursor: default; }
    .error-card { border-color: var(--roto); color: var(--papel-tenue); }
  `],
})
export class MigracionDetalleComponent {
  private api = inject(KontiaApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  sessionId = this.route.snapshot.paramMap.get('id') ?? '';
  detalle = signal<MigrationSessionDetail | null>(null);
  cargando = signal(true);
  procesando = signal<string | null>(null);
  descartando = signal(false);
  confirmando = signal(false);
  errorCommit = signal<string | null>(null);
  resultadoCommit = signal<MigrationCommitResponse | null>(null);

  codigosEditados: Record<string, string> = {};
  fechaAsiento = new Date().toISOString().slice(0, 10);
  cuentaAjuste = '';
  descripcionAsiento = '';

  constructor() {
    this.cargar();
  }

  private cargar() {
    if (!this.sessionId) {
      this.cargando.set(false);
      return;
    }
    this.cargando.set(true);
    this.api.migrationSessionDetail(this.sessionId)
      .then((d) => {
        this.detalle.set(d);
        for (const m of d.mappings) {
          if (!(m.id in this.codigosEditados)) {
            this.codigosEditados[m.id] = m.final_code ?? m.proposed_code ?? '';
          }
        }
      })
      .finally(() => this.cargando.set(false));
  }

  fmt(v: string): string {
    const n = parseFloat(v);
    return (isNaN(n) ? 0 : n).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }

  pct(confidence: string): string {
    const n = parseFloat(confidence);
    return isNaN(n) ? '—' : (n * 100).toFixed(0);
  }

  async aprobar(m: MigrationMapping) {
    this.procesando.set(m.id);
    try {
      await this.api.approveMigrationMapping(m.id, this.codigosEditados[m.id] ?? null);
      this.cargar();
    } catch (e: any) {
      alert(e?.error?.detail ?? 'No se pudo aprobar el mapeo.');
    } finally {
      this.procesando.set(null);
    }
  }

  async rechazar(m: MigrationMapping) {
    const razon = prompt(`Motivo para rechazar la fila #${m.row_no} (opcional):`);
    this.procesando.set(m.id);
    try {
      await this.api.rejectMigrationMapping(m.id, razon || null);
      this.cargar();
    } catch (e: any) {
      alert(e?.error?.detail ?? 'No se pudo rechazar el mapeo.');
    } finally {
      this.procesando.set(null);
    }
  }

  async confirmarImportacion() {
    if (!confirm('¿Confirmar la importación y postear el asiento? Esta acción es irreversible.')) {
      return;
    }
    this.confirmando.set(true);
    this.errorCommit.set(null);
    this.resultadoCommit.set(null);
    try {
      const resultado = await this.api.commitMigrationSession(
        this.sessionId,
        this.fechaAsiento,
        this.cuentaAjuste || null,
        this.descripcionAsiento
      );
      this.resultadoCommit.set(resultado);
      this.cargar();
    } catch (e: any) {
      this.errorCommit.set(e?.error?.detail ?? 'No se pudo confirmar la importación.');
    } finally {
      this.confirmando.set(false);
    }
  }

  async descartar() {
    if (!confirm('¿Descartar esta sesión de migración? No se puede deshacer.')) return;
    this.descartando.set(true);
    try {
      await this.api.discardMigrationSession(this.sessionId);
      this.router.navigate(['/migracion']);
    } catch (e: any) {
      alert(e?.error?.detail ?? 'No se pudo descartar la sesión.');
    } finally {
      this.descartando.set(false);
    }
  }
}