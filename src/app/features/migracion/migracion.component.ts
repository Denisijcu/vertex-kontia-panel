import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MigrationSessionSummary, KontiaApi } from '../../core/services/kontia-api.service';

@Component({
  selector: 'app-migracion',
  standalone: true,
  template: `
    <div class="eyebrow">Migración asistida · QuickBooks / Excel</div>
    <h1 class="titulo">Migración</h1>

    <section class="card form-importar">
      <div class="eyebrow">Importar archivo</div>
      <div class="fila-form">
        <input type="file" accept=".csv,.xlsx,.xls" (change)="onFile($event)" />
        <button (click)="importar()" [disabled]="!archivo() || importando()">
          {{ importando() ? 'Importando…' : 'Importar' }}
        </button>
      </div>
      <p class="tenue">Plan de cuentas exportado de QuickBooks o Excel · máx. 2 MB.</p>
      @if (errorImportar()) {
        <p class="error">{{ errorImportar() }}</p>
      }
    </section>

    @if (cargando()) {
      <section class="card tenue">Consultando sesiones…</section>
    } @else if (sesiones().length === 0) {
      <section class="card tenue">Sin sesiones de migración todavía.</section>
    } @else {
      <section class="card">
        <table>
          <thead>
            <tr>
              <th>Archivo</th><th>Estado</th><th class="cifra">Filas</th>
              <th class="cifra">Pendientes</th><th>Creada</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (s of sesiones(); track s.id) {
              <tr class="fila" (click)="verDetalle(s.id)">
                <td>{{ s.filename }}</td>
                <td><span class="chip">{{ s.status }}</span></td>
                <td class="cifra">{{ s.row_count }}</td>
                <td class="cifra">{{ s.pending_count }}</td>
                <td class="cifra tenue">{{ s.created_at.slice(0, 10) }}</td>
                <td class="tenue">
                  @if (s.committed_entry_id) {
                    asiento posteado
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
    .fila { cursor: pointer; }
    .fila:hover { background: var(--superficie-2); }
    .chip {
      font-family: var(--f-cifras); font-size: 11px;
      border: 1px solid var(--linea); border-radius: 3px; padding: 2px 8px;
    }
    .form-importar { margin-bottom: 20px; }
    .fila-form {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-top: 10px;
    }
    .fila-form input[type="file"] {
      background: var(--superficie-2);
      border: 1px solid var(--linea);
      border-radius: var(--radio);
      color: var(--papel);
      padding: 8px 10px;
      font-size: 13px;
      flex: 1;
    }
    .fila-form button {
      padding: 8px 16px;
      border-radius: var(--radio);
      border: 1px solid var(--laton);
      background: var(--laton);
      color: var(--tinta);
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .fila-form button:disabled { opacity: 0.5; cursor: default; }
    .error { color: var(--roto); font-size: 13px; margin-top: 8px; }
  `],
})
export class MigracionComponent {
  private api = inject(KontiaApi);
  private router = inject(Router);

  sesiones = signal<MigrationSessionSummary[]>([]);
  cargando = signal(true);
  importando = signal(false);
  errorImportar = signal<string | null>(null);
  archivo = signal<File | null>(null);

  constructor() {
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    this.api.migrationSessions()
      .then((s) => this.sesiones.set(s))
      .finally(() => this.cargando.set(false));
  }

  onFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.archivo.set(input.files?.[0] ?? null);
  }

  async importar() {
    const file = this.archivo();
    if (!file) return;
    this.importando.set(true);
    this.errorImportar.set(null);
    try {
      const resultado = await this.api.migrationImport(file);
      this.router.navigate(['/migracion', resultado.session_id]);
    } catch (e: any) {
      this.errorImportar.set(e?.error?.detail ?? 'No se pudo importar el archivo.');
    } finally {
      this.importando.set(false);
    }
  }

  verDetalle(id: string) {
    this.router.navigate(['/migracion', id]);
  }
}