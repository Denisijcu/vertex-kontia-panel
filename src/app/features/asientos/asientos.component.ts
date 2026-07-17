import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Entry, KontiaApi } from '../../core/services/kontia-api.service';

@Component({
  selector: 'app-asientos',
  standalone: true,
  template: `
    <div class="cabecera">
      <div>
        <div class="eyebrow">Libro diario · orden descendente por folio</div>
        <h1 class="titulo">Asientos</h1>
      </div>
      <button class="btn-pdf" (click)="descargarPdf()" [disabled]="descargandoPdf()">
        {{ descargandoPdf() ? 'Generando…' : 'Descargar PDF' }}
      </button>
    </div>

    @if (cargando()) {
      <section class="card tenue">Leyendo el libro…</section>
    } @else if (asientos().length === 0) {
      <section class="card tenue">El libro está vacío. Postea desde el Agente.</section>
    } @else {
      <section class="card">
        <table>
          <thead>
            <tr>
              <th>Folio</th><th>Fecha</th><th>Descripción</th>
              <th>Origen</th><th>Estado</th><th class="cifra">Total</th><th>Sello</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (e of asientos(); track e.id) {
              <tr class="fila">
                <td class="cifra" (click)="alternar(e.id)">#{{ e.entry_no }}</td>
                <td class="cifra" (click)="alternar(e.id)">{{ e.entry_date }}</td>
                <td (click)="alternar(e.id)">{{ e.description }}</td>
                <td (click)="alternar(e.id)"><span class="chip">{{ e.source_module }}</span></td>
                <td (click)="alternar(e.id)">
                  <span class="estado" [class.rev]="e.status === 'reversed'">
                    {{ e.status }}
                  </span>
                </td>
                <td class="cifra" (click)="alternar(e.id)">{{ total(e) }}</td>
                <td class="cifra hash" [title]="e.entry_hash ?? ''" (click)="alternar(e.id)">
                  {{ e.entry_hash?.slice(0, 10) }}…
                </td>
                <td>
                  @if (e.status === 'posted' && soyOwner()) {
                    <button
                      class="btn-revertir"
                      (click)="revertir(e); $event.stopPropagation()"
                      [disabled]="revirtiendo() === e.id"
                    >
                      {{ revirtiendo() === e.id ? '…' : 'Revertir' }}
                    </button>
                  }
                </td>
              </tr>
              @if (abierto() === e.id) {
                <tr class="detalle">
                  <td colspan="8">
                    <table class="lineas">
                      <thead>
                        <tr><th>Cuenta</th><th class="cifra">Debe</th><th class="cifra">Haber</th><th>Memo</th></tr>
                      </thead>
                      <tbody>
                        @for (l of e.lines; track l.line_no) {
                          <tr>
                            <td>{{ l.account_code }} · {{ l.account_name }}</td>
                            <td class="cifra">{{ monto(l.debit) }}</td>
                            <td class="cifra">{{ monto(l.credit) }}</td>
                            <td class="tenue">{{ l.memo ?? '—' }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
        @if (hayMas()) {
          <button class="mas" (click)="cargarMas()">Cargar folios anteriores</button>
        }
      </section>
    }
  `,
  styles: [`
    .titulo { margin-bottom: 24px; }
    .tenue { color: var(--papel-tenue); }
    .fila { cursor: pointer; }
    .chip {
      font-family: var(--f-cifras); font-size: 11px;
      border: 1px solid var(--linea); border-radius: 3px; padding: 2px 8px;
    }
    .estado { font-family: var(--f-cifras); font-size: 12px; color: var(--cuadrado); }
    .estado.rev { color: var(--pendiente); }
    .hash { font-size: 11px; color: var(--laton); }
    .detalle td { background: var(--tinta); padding: 12px 18px; }
    .lineas th { font-size: 10px; }
    .mas { margin-top: 16px; }
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
    /* --- Botón de revertir (storno) --- */
    .btn-revertir {
      font-size: 11px;
      padding: 5px 10px;
      border-radius: var(--radio);
      border: 1px solid var(--roto);
      background: transparent;
      color: var(--roto);
      cursor: pointer;
      white-space: nowrap;
    }
    .btn-revertir:hover { background: var(--roto); color: var(--tinta); }
    .btn-revertir:disabled { opacity: 0.5; cursor: default; }
  `],
})
export class AsientosComponent {
  private api = inject(KontiaApi);
  private auth = inject(AuthService);

  asientos = signal<Entry[]>([]);
  cargando = signal(true);
  abierto = signal<string | null>(null);
  hayMas = signal(false);
  descargandoPdf = signal(false);
  revirtiendo = signal<string | null>(null);

  soyOwner = () => this.auth.user()?.role === 'owner';

  constructor() {
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    this.api.entries(50).then((e) => {
      this.asientos.set(e);
      this.hayMas.set(e.length === 50);
    }).finally(() => this.cargando.set(false));
  }

  alternar(id: string) {
    this.abierto.set(this.abierto() === id ? null : id);
  }

  async cargarMas() {
    const ultimo = this.asientos().at(-1);
    if (!ultimo) return;
    const mas = await this.api.entries(50, ultimo.entry_no);
    this.asientos.update((a) => [...a, ...mas]);
    this.hayMas.set(mas.length === 50);
  }

  total(e: Entry): string {
    const t = e.lines.reduce((s, l) => s + parseFloat(l.debit), 0);
    return t.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  monto(v: string): string {
    const n = parseFloat(v);
    return n > 0 ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '—';
  }

  async descargarPdf() {
    this.descargandoPdf.set(true);
    try {
      // Sin date_from/date_to: el libro diario completo, no solo los
      // 50 folios paginados que se ven en pantalla.
      await this.api.journalEntriesPdf();
    } finally {
      this.descargandoPdf.set(false);
    }
  }

  async revertir(e: Entry) {
    const razon = prompt(
      `Motivo para revertir el asiento #${e.entry_no} (queda en el audit log):`
    );
    if (!razon || razon.trim().length < 3) return;
    if (!confirm(`¿Revertir el asiento #${e.entry_no}? Se crea un asiento espejo, el original queda marcado como revertido.`)) {
      return;
    }
    this.revirtiendo.set(e.id);
    try {
      await this.api.reverseEntry(e.id, razon.trim());
      this.cargar();
    } catch (err: any) {
      alert(err?.error?.detail ?? 'No se pudo revertir el asiento.');
    } finally {
      this.revirtiendo.set(null);
    }
  }
}