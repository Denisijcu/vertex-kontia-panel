import { Component, inject, signal } from '@angular/core';
import { AuditFinding, KontiaApi } from '../../core/services/kontia-api.service';

@Component({
  selector: 'app-hallazgos',
  standalone: true,
  template: `
    <div class="cabecera">
      <div>
        <div class="eyebrow">Pre-auditoría nightly · checklist de compliance · 06:00 UTC</div>
        <h1 class="titulo">Hallazgos</h1>
      </div>
      <button class="btn-pdf" (click)="descargarPdf()" [disabled]="descargandoPdf()">
        {{ descargandoPdf() ? 'Generando…' : 'Descargar PDF' }}
      </button>
    </div>

    <section class="card acciones">
      <label class="check">
        <input
          type="checkbox"
          [checked]="incluirResueltos()"
          (change)="alternarResueltos($event)"
        />
        Incluir resueltos
      </label>
      <span class="conteo tenue">{{ hallazgos().length }} hallazgo(s)</span>
    </section>

    @if (cargando()) {
      <section class="card tenue">Consultando hallazgos…</section>
    } @else if (hallazgos().length === 0) {
      <section class="card tenue">
        Sin hallazgos {{ incluirResueltos() ? '' : 'abiertos' }}. El nightly corre solo, todas
        las noches a las 06:00 UTC.
      </section>
    } @else {
      <section class="card">
        <table>
          <thead>
            <tr>
              <th>Severidad</th><th>Check</th><th>Título</th><th>Fecha</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (f of hallazgos(); track f.id) {
              <tr>
                <td><span class="sev sev-{{ f.severity }}">{{ f.severity.toUpperCase() }}</span></td>
                <td><span class="chip">{{ f.check_id }}</span></td>
                <td>{{ f.title }}</td>
                <td class="cifra">{{ f.created_at.slice(0, 10) }}</td>
                <td>
                  <span class="estado" [class.rev]="f.resolved">
                    {{ f.resolved ? 'Resuelto' : 'Abierto' }}
                  </span>
                </td>
                <td>
                  @if (!f.resolved) {
                    <button
                      class="btn-resolver"
                      (click)="resolver(f.id)"
                      [disabled]="resolviendo() === f.id"
                    >
                      {{ resolviendo() === f.id ? '…' : 'Resolver' }}
                    </button>
                  }
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
    .cabecera {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .acciones {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding: 14px 18px;
    }
    .check {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      cursor: pointer;
    }
    .conteo { font-size: 12px; }
    .chip {
      font-family: var(--f-cifras); font-size: 11px;
      border: 1px solid var(--linea); border-radius: 3px; padding: 2px 8px;
    }
    .sev {
      font-family: var(--f-cifras);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      padding: 2px 8px;
      border-radius: 3px;
      white-space: nowrap;
    }
    .sev-critical { color: var(--roto); border: 1px solid var(--roto); }
    .sev-warning { color: var(--laton); border: 1px solid var(--laton); }
    .sev-info { color: var(--papel-tenue); border: 1px solid var(--linea); }
    .estado { font-family: var(--f-cifras); font-size: 12px; color: var(--pendiente); }
    .estado.rev { color: var(--cuadrado); }
    .btn-resolver, .btn-pdf {
      font-size: 12px;
      padding: 6px 12px;
      border-radius: var(--radio);
      border: 1px solid var(--linea);
      background: var(--superficie-2);
      color: var(--papel);
      cursor: pointer;
      white-space: nowrap;
    }
    .btn-pdf { padding: 7px 14px; margin-top: 2px; }
    .btn-resolver:hover, .btn-pdf:hover { border-color: var(--laton); color: var(--laton); }
    .btn-resolver:disabled, .btn-pdf:disabled { opacity: 0.5; cursor: default; }
  `],
})
export class HallazgosComponent {
  private api = inject(KontiaApi);

  hallazgos = signal<AuditFinding[]>([]);
  cargando = signal(true);
  incluirResueltos = signal(false);
  descargandoPdf = signal(false);
  resolviendo = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    this.api
      .auditFindings(this.incluirResueltos())
      .then((f) => this.hallazgos.set(f))
      .finally(() => this.cargando.set(false));
  }

  alternarResueltos(ev: Event) {
    this.incluirResueltos.set((ev.target as HTMLInputElement).checked);
    this.cargar();
  }

  async resolver(id: string) {
    this.resolviendo.set(id);
    try {
      await this.api.resolveFinding(id);
      this.cargar();
    } finally {
      this.resolviendo.set(null);
    }
  }

  async descargarPdf() {
    this.descargandoPdf.set(true);
    try {
      await this.api.auditFindingsPdf(this.incluirResueltos());
    } finally {
      this.descargandoPdf.set(false);
    }
  }
}