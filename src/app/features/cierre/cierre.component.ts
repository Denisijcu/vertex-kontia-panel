import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CloseYearResult, FiscalPeriod, KontiaApi } from '../../core/services/kontia-api.service';

@Component({
  selector: 'app-cierre',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="eyebrow">Períodos fiscales y cierre de ejercicio · solo owner</div>
    <h1 class="titulo">Cierre</h1>

    <!-- ============ CIERRE DE EJERCICIO (asiento de cierre) ============ -->
    <section class="card cierre-ano">
      <div class="eyebrow">Cierre de ejercicio anual</div>
      <p class="tenue">
        Postea el asiento de cierre del año: mueve ingresos y gastos a resultados
        acumulados. Requiere que diciembre siga abierto.
      </p>
      <div class="fila-form">
        <input
          type="number"
          placeholder="Año (ej. 2026)"
          [(ngModel)]="anoCierre"
          name="ano"
          min="2000"
          max="2100"
        />
        <button (click)="cerrarAno()" [disabled]="cerrandoAno()">
          {{ cerrandoAno() ? 'Cerrando…' : 'Cerrar año' }}
        </button>
      </div>
      @if (errorCierreAno()) {
        <p class="error">{{ errorCierreAno() }}</p>
      }
      @if (resultadoCierreAno(); as r) {
        <div class="resultado-cierre">
          <div class="eyebrow">Ejercicio {{ r.year }} cerrado</div>
          <div class="resumen-cierre">
            <div class="dato">
              <span class="etiqueta">Asiento</span>
              <span class="valor cifra">#{{ r.entry_no }}</span>
            </div>
            <div class="dato">
              <span class="etiqueta">Resultado neto</span>
              <span class="valor cifra" [class.negativo]="r.net_income < 0">
                {{ fmt(r.net_income) }}
              </span>
            </div>
            <div class="dato">
              <span class="etiqueta">Líneas cerradas</span>
              <span class="valor cifra">{{ r.lines_closed }}</span>
            </div>
          </div>
          <p class="tenue nota-ver">
            El asiento de cierre ya está posteado — puedes verlo completo en
            la pantalla de Asientos, folio #{{ r.entry_no }}.
          </p>
        </div>
      }
    </section>

    <!-- ============ PERIODOS FISCALES ============ -->
    @if (cargando()) {
      <section class="card tenue">Consultando períodos…</section>
    } @else if (periodos().length === 0) {
      <section class="card tenue">Sin períodos configurados.</section>
    } @else {
      <section class="card">
        <table>
          <thead>
            <tr>
              <th>Período</th><th>Desde</th><th>Hasta</th><th>Estado</th>
              <th>Cerrado el</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (p of periodos(); track p.id) {
              <tr>
                <td>{{ p.name }}</td>
                <td class="cifra tenue">{{ p.start_date }}</td>
                <td class="cifra tenue">{{ p.end_date }}</td>
                <td><span class="estado estado-{{ p.status }}">{{ etiqueta(p.status) }}</span></td>
                <td class="cifra tenue">{{ p.closed_at ? p.closed_at.slice(0, 10) : '—' }}</td>
                <td class="acciones">
                  @if (p.status === 'open') {
                    <button
                      class="btn-accion cerrar"
                      (click)="cerrarPeriodo(p)"
                      [disabled]="procesando() === p.name"
                    >
                      {{ procesando() === p.name ? '…' : 'Cerrar período' }}
                    </button>
                  }
                  @if (p.status === 'closed') {
                    <button
                      class="btn-accion reabrir"
                      (click)="reabrirPeriodo(p)"
                      [disabled]="procesando() === p.name"
                    >
                      {{ procesando() === p.name ? '…' : 'Reabrir' }}
                    </button>
                    <button
                      class="btn-accion bloquear"
                      (click)="bloquearPeriodo(p)"
                      [disabled]="procesando() === p.name"
                    >
                      {{ procesando() === p.name ? '…' : 'Bloquear' }}
                    </button>
                  }
                  @if (p.status === 'locked') {
                    <span class="tenue">Bloqueado — sin más acciones</span>
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
    .cierre-ano { margin-bottom: 20px; }
    .fila-form {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-top: 12px;
    }
    .fila-form input {
      background: var(--superficie-2);
      border: 1px solid var(--linea);
      border-radius: var(--radio);
      color: var(--papel);
      padding: 8px 10px;
      font-size: 13px;
      width: 160px;
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
    .error { color: var(--roto); font-size: 13px; margin-top: 10px; }
    .resultado-cierre {
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid var(--linea);
    }
    .resumen-cierre {
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
      margin-top: 8px;
      margin-bottom: 10px;
    }
    .dato { display: flex; flex-direction: column; gap: 4px; }
    .etiqueta {
      font-size: 11px; text-transform: uppercase;
      letter-spacing: 0.1em; color: var(--papel-tenue);
    }
    .valor { font-size: 18px; color: var(--cuadrado); }
    .valor.negativo { color: var(--roto); }
    .nota-ver { font-size: 13px; }
    .estado {
      font-family: var(--f-cifras);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.04em;
    }
    .estado-open { color: var(--pendiente); }
    .estado-closed { color: var(--cuadrado); }
    .estado-locked { color: var(--papel-tenue); }
    .acciones { display: flex; gap: 8px; align-items: center; }
    .btn-accion {
      font-size: 12px;
      padding: 6px 12px;
      border-radius: var(--radio);
      background: transparent;
      cursor: pointer;
      white-space: nowrap;
    }
    .btn-accion.cerrar { border: 1px solid var(--cuadrado); color: var(--cuadrado); }
    .btn-accion.cerrar:hover { background: var(--cuadrado); color: var(--tinta); }
    .btn-accion.reabrir { border: 1px solid var(--pendiente); color: var(--pendiente); }
    .btn-accion.reabrir:hover { background: var(--pendiente); color: var(--tinta); }
    .btn-accion.bloquear { border: 1px solid var(--papel-tenue); color: var(--papel-tenue); }
    .btn-accion.bloquear:hover { background: var(--papel-tenue); color: var(--tinta); }
    .btn-accion:disabled { opacity: 0.5; cursor: default; }
  `],
})
export class CierreComponent {
  private api = inject(KontiaApi);

  periodos = signal<FiscalPeriod[]>([]);
  cargando = signal(true);
  procesando = signal<string | null>(null);

  anoCierre: number | null = new Date().getFullYear();
  cerrandoAno = signal(false);
  errorCierreAno = signal<string | null>(null);
  resultadoCierreAno = signal<CloseYearResult | null>(null);

  constructor() {
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    this.api.periods()
      .then((p) => this.periodos.set(p))
      .finally(() => this.cargando.set(false));
  }

  etiqueta(status: string): string {
    const m: Record<string, string> = {
      open: 'Abierto', closed: 'Cerrado', locked: 'Bloqueado',
    };
    return m[status] ?? status;
  }

  async cerrarPeriodo(p: FiscalPeriod) {
    if (!confirm(`¿Cerrar el período ${p.name}?`)) return;
    this.procesando.set(p.name);
    try {
      await this.api.closePeriod(p.name);
      this.cargar();
    } catch (e: any) {
      alert(e?.error?.detail ?? 'No se pudo cerrar el período.');
    } finally {
      this.procesando.set(null);
    }
  }

  async reabrirPeriodo(p: FiscalPeriod) {
    const razon = prompt(`Motivo para reabrir ${p.name} (queda en el audit log):`);
    if (!razon || razon.trim().length < 3) return;
    this.procesando.set(p.name);
    try {
      await this.api.reopenPeriod(p.name, razon.trim());
      this.cargar();
    } catch (e: any) {
      alert(e?.error?.detail ?? 'No se pudo reabrir el período.');
    } finally {
      this.procesando.set(null);
    }
  }

  async bloquearPeriodo(p: FiscalPeriod) {
    if (!confirm(`¿Bloquear ${p.name}? Es un candado permanente — no hay endpoint para desbloquear.`)) {
      return;
    }
    this.procesando.set(p.name);
    try {
      await this.api.lockPeriod(p.name);
      this.cargar();
    } catch (e: any) {
      alert(e?.error?.detail ?? 'No se pudo bloquear el período.');
    } finally {
      this.procesando.set(null);
    }
  }

  async cerrarAno() {
    if (!this.anoCierre) return;
    if (!confirm(`¿Postear el asiento de cierre del año ${this.anoCierre}? Esta acción mueve saldos reales.`)) {
      return;
    }
    this.cerrandoAno.set(true);
    this.errorCierreAno.set(null);
    this.resultadoCierreAno.set(null);
    try {
      const resultado = await this.api.closeYear(this.anoCierre);
      this.resultadoCierreAno.set(resultado);
      this.cargar();
    } catch (e: any) {
      this.errorCierreAno.set(e?.error?.detail ?? 'No se pudo cerrar el año.');
    } finally {
      this.cerrandoAno.set(false);
    }
  }

  fmt(v: number): string {
    return (isNaN(v) ? 0 : v).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }
}