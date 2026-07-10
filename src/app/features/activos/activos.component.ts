import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  FixedAssetOut,
  KontiaApi,
} from '../../core/services/kontia-api.service';
import { StatusService } from '../../core/services/status.service';

const COST_CENTERS = [
  '', 'KONTIA', 'SEISMIC', 'DENTIAPRO', 'OSINT', 'CIVIX',
  'CLAUSTORE', 'LINGUAIT', 'VCUP', 'GENERAL',
];

@Component({
  selector: 'app-activos',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="eyebrow">Subledger de activos · depreciación línea recta</div>
    <h1 class="titulo">Activos Fijos</h1>

    <!-- ============ ALTA ============ -->
    <section class="card alta">
      <div class="eyebrow">Dar de alta un activo</div>
      <div class="form-grid">
        <label>
          Nombre del activo
          <input [(ngModel)]="fNombre" placeholder="Laptop, monitor, impresora…" maxlength="200" />
        </label>
        <label>
          Fecha de adquisición
          <input type="date" [(ngModel)]="fFecha" />
        </label>
        <label>
          Costo (USD)
          <input type="number" step="0.01" min="0.01" [(ngModel)]="fCosto" placeholder="0.00" />
        </label>
        <label>
          Vida útil (meses)
          <input type="number" min="1" max="600" [(ngModel)]="fVida" placeholder="36" />
        </label>
        <label>
          Valor residual (USD)
          <input type="number" step="0.01" min="0" [(ngModel)]="fResidual" placeholder="0.00" />
        </label>
        <label>
          Proyecto (opcional)
          <select [(ngModel)]="fCostCenter">
            @for (cc of costCenters; track cc) {
              <option [value]="cc">{{ cc || '— ninguno —' }}</option>
            }
          </select>
        </label>
        <label class="ancho-completo pago-con">
          Pagado con
          <div class="radio-fila">
            <label class="radio">
              <input type="radio" name="credito" value="1100" [(ngModel)]="fCredito" />
              Banco (1100)
            </label>
            <label class="radio">
              <input type="radio" name="credito" value="2200" [(ngModel)]="fCredito" />
              Tarjeta (2200)
            </label>
            <label class="radio">
              <input type="radio" name="credito" value="3100" [(ngModel)]="fCredito" />
              Aporte del miembro (3100)
            </label>
          </div>
        </label>
      </div>
      <div class="acciones">
        <button class="primaria" (click)="darAlta()" [disabled]="creando() || !formValido()">
          {{ creando() ? 'Posteando…' : 'Dar de alta y postear' }}
        </button>
        @if (mensaje(); as m) {
          <span class="mensaje" [class.error]="m.error">{{ m.texto }}</span>
        }
      </div>
    </section>

    <!-- ============ DEPRECIACIÓN ============ -->
    <section class="card">
      <div class="eyebrow">Corrida de depreciación</div>
      <div class="corrida">
        <input type="month" [(ngModel)]="periodo" />
        <button class="primaria" (click)="correrDepreciacion()" [disabled]="corriendo() || !periodo">
          {{ corriendo() ? 'Corriendo…' : 'Correr período' }}
        </button>
        <span class="hint">Idempotente: un período corrido no se duplica.</span>
      </div>
      @if (resultadoCorrida(); as r) {
        <div class="resultado-corrida">
          @if (r.posted.length > 0) {
            <p class="ok-msg">
              Posteado {{ r.period }}:
              @for (p of r.posted; track p.asset) {
                <span class="cifra">{{ p.asset }} · {{ fmtNum(p.amount) }}</span>
              }
            </p>
          }
          @if (r.skipped.length > 0) {
            <p class="skip-msg">
              Saltados:
              @for (s of r.skipped; track s.asset) {
                <span>{{ s.asset }} ({{ s.reason }})</span>
              }
            </p>
          }
          @if (r.posted.length === 0 && r.skipped.length === 0) {
            <p class="skip-msg">Sin activos que depreciar en {{ r.period }}.</p>
          }
        </div>
      }
    </section>

    <!-- ============ LISTADO ============ -->
    <section class="card">
      <div class="eyebrow">Activos · {{ activos().length }} en total</div>
      @if (activos().length === 0) {
        <p class="vacio">Sin activos registrados todavía.</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Activo</th>
              <th>Adquirido</th>
              <th class="cifra">Costo</th>
              <th class="cifra">Depreciado</th>
              <th class="cifra">Valor en libros</th>
              <th>Vida</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (a of activos(); track a.id) {
              <tr>
                <td>
                  {{ a.name }}
                  @if (a.cost_center) {
                    <div class="sub">{{ a.cost_center }}</div>
                  }
                </td>
                <td>{{ a.acquisition_date }}</td>
                <td class="cifra">{{ fmt(a.cost) }}</td>
                <td class="cifra">({{ fmt(a.accumulated_depreciation) }})</td>
                <td class="cifra vlibros">{{ fmt(a.book_value) }}</td>
                <td class="cifra">{{ a.useful_life_months }}m</td>
                <td>
                  <span class="estado" [class]="'estado ' + a.status">{{ a.status }}</span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: [
    `
      .titulo { margin-bottom: 24px; }
      .card { margin-bottom: 20px; }
      .alta { margin-bottom: 20px; }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 14px;
        margin: 14px 0;
      }
      .form-grid label {
        display: flex; flex-direction: column; gap: 5px;
        font-size: 12px; color: var(--papel-tenue);
        text-transform: uppercase; letter-spacing: 0.08em;
      }
      .form-grid select {
        font-family: var(--f-ui); font-size: 15px;
        background: var(--tinta); border: 1px solid var(--linea);
        border-radius: var(--radio); color: var(--papel);
        padding: 10px 12px;
      }
      .form-grid select:focus { outline: none; border-color: var(--laton); }
      .ancho-completo { grid-column: 1 / -1; }
      .radio-fila { display: flex; gap: 20px; flex-wrap: wrap; }
      .radio {
        flex-direction: row !important; align-items: center;
        gap: 8px !important; text-transform: none !important;
        letter-spacing: normal !important; font-size: 14px !important;
        color: var(--papel) !important; cursor: pointer;
      }
      .radio input { width: auto; }
      .acciones { display: flex; align-items: center; gap: 14px; }
      .mensaje { font-size: 13px; color: var(--cuadrado); }
      .mensaje.error { color: var(--roto); }
      /* Corrida */
      .corrida { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 10px; }
      .corrida input { width: 180px; }
      .hint { font-size: 12px; color: var(--papel-tenue); }
      .resultado-corrida { margin-top: 12px; font-size: 13px; }
      .ok-msg { color: var(--cuadrado); display: flex; gap: 12px; flex-wrap: wrap; }
      .ok-msg .cifra { text-align: left; }
      .skip-msg { color: var(--papel-tenue); display: flex; gap: 12px; flex-wrap: wrap; margin-top: 6px; }
      /* Listado */
      .sub { font-size: 11px; color: var(--laton); letter-spacing: 0.06em; }
      .vlibros { color: var(--laton); font-weight: 600; }
      .estado {
        font-family: var(--f-cifras); font-size: 11px;
        letter-spacing: 0.1em; padding: 3px 8px;
        border-radius: 3px; border: 1px solid var(--linea);
      }
      .estado.active { border-color: var(--cuadrado); color: var(--cuadrado); }
      .estado.disposed { color: var(--papel-tenue); text-decoration: line-through; }
      .vacio { color: var(--papel-tenue); font-size: 14px; }
      @media (max-width: 800px) {
        .form-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class ActivosComponent {
  private api = inject(KontiaApi);
  private status = inject(StatusService);

  readonly costCenters = COST_CENTERS;

  activos = signal<FixedAssetOut[]>([]);
  creando = signal(false);
  corriendo = signal(false);
  mensaje = signal<{ texto: string; error: boolean } | null>(null);
  resultadoCorrida = signal<any | null>(null);

  fNombre = '';
  fFecha = new Date().toISOString().slice(0, 10);
  fCosto = '';
  fVida = '';
  fResidual = '0';
  fCostCenter = '';
  fCredito = '1100';

  periodo = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  constructor() {
    this.cargar();
  }

  async cargar() {
    try {
      this.activos.set(await this.api.fixedAssets());
    } catch {
      /* backend caído: pantalla vacía sin romper */
    }
  }

  formValido(): boolean {
    return (
      this.fNombre.trim().length >= 2 &&
      parseFloat(this.fCosto) > 0 &&
      parseInt(this.fVida, 10) >= 1 &&
      parseFloat(this.fResidual || '0') >= 0 &&
      parseFloat(this.fResidual || '0') < parseFloat(this.fCosto) &&
      this.fFecha !== ''
    );
  }

  async darAlta() {
    if (!this.formValido() || this.creando()) return;
    this.creando.set(true);
    this.mensaje.set(null);
    try {
      await this.api.createFixedAsset({
        name: this.fNombre.trim(),
        acquisition_date: this.fFecha,
        cost: this.fCosto,
        useful_life_months: parseInt(this.fVida, 10),
        salvage_value: this.fResidual || '0',
        cost_center: this.fCostCenter || null,
        credit_account_code: this.fCredito,
      });
      this.mensaje.set({ texto: 'Activo dado de alta · asiento sellado', error: false });
      this.fNombre = '';
      this.fCosto = '';
      this.fVida = '';
      this.fResidual = '0';
      this.fCostCenter = '';
      await this.cargar();
      this.status.refresh(); // el alta postea al ledger
    } catch (e: any) {
      this.mensaje.set({
        texto: e?.error?.detail ?? 'No se pudo dar de alta el activo.',
        error: true,
      });
    } finally {
      this.creando.set(false);
    }
  }

  async correrDepreciacion() {
    if (!this.periodo || this.corriendo()) return;
    this.corriendo.set(true);
    this.resultadoCorrida.set(null);
    try {
      const r = await this.api.runDepreciation(this.periodo);
      this.resultadoCorrida.set(r);
      await this.cargar();
      if (r.posted?.length > 0) {
        this.status.refresh(); // hubo postings al ledger
      }
    } catch (e: any) {
      this.mensaje.set({
        texto: e?.error?.detail ?? 'No se pudo correr la depreciación.',
        error: true,
      });
    } finally {
      this.corriendo.set(false);
    }
  }

  fmt(v: string): string {
    const n = parseFloat(v);
    return (isNaN(n) ? 0 : n).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }

  fmtNum(v: number): string {
    return (typeof v === 'number' && !isNaN(v) ? v : 0).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }
}