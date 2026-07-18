import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AccountNode,
  AgingReport,
  InvoiceOut,
  KontiaApi,
} from '../../core/services/kontia-api.service';
import { StatusService } from '../../core/services/status.service';

import { ScanInvoiceComponent } from '../invoices/scan-invoice/scan-invoice.component';

const COST_CENTERS = [
  '', 'KONTIA', 'SEISMIC', 'DENTIAPRO', 'OSINT', 'CIVIX',
  'CLAUSTORE', 'LINGUAIT', 'VCUP', 'GENERAL',
];

@Component({
  selector: 'app-facturas',
  standalone: true,
  imports: [FormsModule, ScanInvoiceComponent],
  template: `
    <div class="eyebrow">Subledger AR/AP · asientos vía posting engine</div>
    <h1 class="titulo">Facturas</h1>

    <!-- ============ DIRECCIÓN ============ -->
    <div class="tabs">
      <button [class.activa]="direccion() === 'receivable'" (click)="cambiarDireccion('receivable')">
        Por cobrar
      </button>
      <button [class.activa]="direccion() === 'payable'" (click)="cambiarDireccion('payable')">
        Por pagar
      </button>
    </div>

    <!-- ============ EMISIÓN ============ -->
    <section class="card emision">
      <div class="eyebrow">
        Emitir factura {{ direccion() === 'receivable' ? 'por cobrar' : 'por pagar' }}
      </div>
      <div class="form-grid">
        <label>
          {{ direccion() === 'receivable' ? 'Cliente' : 'Proveedor' }}
          <input [(ngModel)]="fContraparte" placeholder="Nombre" maxlength="120" />
        </label>
        <label>
          Nº de factura (opcional)
          <input [(ngModel)]="fNumero" placeholder="INV-001" maxlength="60" />
        </label>
        <label>
          Fecha de emisión
          <input type="date" [(ngModel)]="fEmision" />
        </label>
        <label>
          Vencimiento
          <input type="date" [(ngModel)]="fVence" />
        </label>
        <label>
          Monto (USD)
          <input type="number" step="0.01" min="0.01" [(ngModel)]="fMonto" placeholder="0.00" />
        </label>
        <label>
          Cuenta de {{ direccion() === 'receivable' ? 'ingreso' : 'gasto' }}
          <select [(ngModel)]="fCuenta">
            <option value="">— seleccionar —</option>
            @for (a of cuentasFiltradas(); track a.code) {
              <option [value]="a.code">{{ a.code }} · {{ a.name }}</option>
            }
          </select>
        </label>
        <label>
          Proyecto (opcional)
          <select [(ngModel)]="fCostCenter">
            @for (cc of costCenters; track cc) {
              <option [value]="cc">{{ cc || '— ninguno —' }}</option>
            }
          </select>
        </label>
        <label class="ancho-completo">
          Descripción
          <input [(ngModel)]="fDescripcion" placeholder="Servicio de desarrollo — proyecto X" maxlength="300" />
        </label>
      </div>
      <div class="acciones">
        <button class="primaria" (click)="emitir()" [disabled]="emitiendo() || !formValido()">
          {{ emitiendo() ? 'Emitiendo…' : 'Emitir y postear' }}
        </button>
        @if (mensaje(); as m) {
          <span class="mensaje" [class.error]="m.error">{{ m.texto }}</span>
        }
      </div>
    </section>

    <!-- ============ AGING ============ -->
    @if (aging(); as ag) {
      <section class="card">
        <div class="eyebrow">
          Antigüedad de saldos · {{ direccion() === 'receivable' ? 'por cobrar' : 'por pagar' }} · al {{ ag.as_of }}
        </div>
        <div class="aging-strip">
          @for (b of bucketNames; track b) {
            <div class="bucket" [class.vencido]="b !== 'current' && ag.totals[b] > 0">
              <span class="bucket-nombre">{{ etiquetaBucket(b) }}</span>
              <span class="cifra bucket-total">{{ fmtNum(ag.totals[b]) }}</span>
            </div>
          }
          <div class="bucket total">
            <span class="bucket-nombre">Total</span>
            <span class="cifra bucket-total">{{ fmtNum(ag.grand_total) }}</span>
          </div>
        </div>
      </section>
    }

    <!-- ============ LISTADO ============ -->
    <section class="card">
      <div class="eyebrow">
        Facturas · {{ facturas().length }} en total
        <select class="filtro" [(ngModel)]="filtroStatus" (ngModelChange)="cargar()">
          <option value="">todas</option>
          <option value="open">open</option>
          <option value="partial">partial</option>
          <option value="paid">paid</option>
          <option value="void">void</option>
        </select>
      </div>
      @if (facturas().length === 0) {
        <p class="vacio">Sin facturas {{ direccion() === 'receivable' ? 'por cobrar' : 'por pagar' }} todavía.</p>
      } @else {
        <app-scan-invoice />
        <table>
          <thead>
            <tr>
              <th>Contraparte</th>
              <th>Nº</th>
              <th>Vence</th>
              <th class="cifra">Monto</th>
              <th class="cifra">Pendiente</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (f of facturas(); track f.id) {
              <tr>
                <td>{{ f.counterparty }}<div class="sub">{{ f.description }}</div></td>
                <td>{{ f.invoice_number || '—' }}</td>
                <td>{{ f.due_date }}</td>
                <td class="cifra">{{ fmt(f.amount) }}</td>
                <td class="cifra">{{ fmt(f.outstanding) }}</td>
                <td><span class="estado" [class]="'estado ' + f.status">{{ f.status }}</span></td>
                <td class="celda-acciones">
                  @if (accionId() === f.id && accionTipo() === 'pago') {
                    <input type="number" step="0.01" class="mini" [(ngModel)]="montoPago" placeholder="Monto" />
                    <button (click)="confirmarPago(f)" [disabled]="!montoPago">OK</button>
                    <button (click)="cancelarAccion()">×</button>
                  } @else if (accionId() === f.id && accionTipo() === 'void') {
                    <input class="mini-ancha" [(ngModel)]="razonVoid" placeholder="Razón de anulación" />
                    <button (click)="confirmarVoid(f)" [disabled]="razonVoid.trim().length < 3">OK</button>
                    <button (click)="cancelarAccion()">×</button>
                  } @else {
                    @if (f.status === 'open' || f.status === 'partial') {
                      <button class="primaria" (click)="iniciarPago(f)">
                        {{ direccion() === 'receivable' ? 'Cobrar' : 'Pagar' }}
                      </button>
                    }
                    @if (f.status === 'open') {
                      <button (click)="iniciarVoid(f)">Anular</button>
                    }
                  }
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
      .tabs { display: flex; gap: 8px; margin-bottom: 20px; }
      .tabs button.activa {
        border-color: var(--laton);
        color: var(--laton);
        font-weight: 600;
      }
      .emision { margin-bottom: 20px; }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
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
      .acciones { display: flex; align-items: center; gap: 14px; }
      .mensaje { font-size: 13px; color: var(--cuadrado); }
      .mensaje.error { color: var(--roto); }
      .card { margin-bottom: 20px; }
      /* Aging */
      .aging-strip { display: flex; gap: 12px; flex-wrap: wrap; }
      .bucket {
        flex: 1; min-width: 100px;
        display: flex; flex-direction: column; gap: 4px;
        padding: 12px; border: 1px solid var(--linea);
        border-radius: var(--radio); background: var(--superficie-2);
      }
      .bucket.vencido { border-color: var(--pendiente); }
      .bucket.total { border-color: var(--laton); }
      .bucket-nombre {
        font-size: 11px; text-transform: uppercase;
        letter-spacing: 0.1em; color: var(--papel-tenue);
      }
      .bucket-total { font-size: 18px; text-align: left; }
      /* Listado */
      .filtro {
        margin-left: 12px; font-size: 12px;
        background: var(--tinta); border: 1px solid var(--linea);
        border-radius: 3px; color: var(--papel); padding: 3px 6px;
      }
      .sub { font-size: 12px; color: var(--papel-tenue); }
      .estado {
        font-family: var(--f-cifras); font-size: 11px;
        letter-spacing: 0.1em; padding: 3px 8px;
        border-radius: 3px; border: 1px solid var(--linea);
      }
      .estado.open { border-color: var(--pendiente); color: var(--pendiente); }
      .estado.partial { border-color: var(--laton); color: var(--laton); }
      .estado.paid { border-color: var(--cuadrado); color: var(--cuadrado); }
      .estado.void { color: var(--papel-tenue); text-decoration: line-through; }
      .celda-acciones { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
      .celda-acciones button { padding: 5px 10px; min-height: 32px; font-size: 13px; }
      .mini { width: 90px; padding: 6px 8px; font-size: 13px; }
      .mini-ancha { width: 180px; padding: 6px 8px; font-size: 13px; }
      .vacio { color: var(--papel-tenue); font-size: 14px; }
      @media (max-width: 800px) {
        .form-grid { grid-template-columns: 1fr; }
        .aging-strip { flex-direction: column; }
      }
    `,
  ],
})
export class FacturasComponent {
  private api = inject(KontiaApi);
  private status = inject(StatusService);

  readonly costCenters = COST_CENTERS;
  readonly bucketNames = ['current', '1-30', '31-60', '61-90', '90+'];

  direccion = signal<'receivable' | 'payable'>('receivable');
  facturas = signal<InvoiceOut[]>([]);
  aging = signal<AgingReport | null>(null);
  cuentas = signal<AccountNode[]>([]);
  emitiendo = signal(false);
  mensaje = signal<{ texto: string; error: boolean } | null>(null);
  accionId = signal<string | null>(null);
  accionTipo = signal<'pago' | 'void' | null>(null);

  filtroStatus = '';
  montoPago = '';
  razonVoid = '';

  // Formulario de emisión
  fContraparte = '';
  fNumero = '';
  fEmision = new Date().toISOString().slice(0, 10);
  fVence = this.enTreintaDias();
  fMonto = '';
  fCuenta = '';
  fCostCenter = '';
  fDescripcion = '';

  cuentasFiltradas = computed(() => {
    const tipo = this.direccion() === 'receivable' ? 'income' : 'expense';
    return this.cuentas().filter(
      (a) => a.account_type === tipo && a.is_postable && a.is_active
    );
  });

  constructor() {
    this.api.accounts().then((a) => this.cuentas.set(a)).catch(() => {});
    this.cargar();
  }

  cambiarDireccion(d: 'receivable' | 'payable') {
    this.direccion.set(d);
    this.fCuenta = '';
    this.cancelarAccion();
    this.cargar();
  }

  async cargar() {
    try {
      const [lista, ag] = await Promise.all([
        this.api.invoices(this.direccion(), this.filtroStatus || undefined),
        this.api.invoiceAging(this.direccion()),
      ]);
      this.facturas.set(lista);
      this.aging.set(ag);
    } catch {
      /* backend caído: la pantalla queda vacía sin romper */
    }
  }

  formValido(): boolean {
    return (
      this.fContraparte.trim().length >= 2 &&
      parseFloat(this.fMonto) > 0 &&
      this.fCuenta !== '' &&
      this.fDescripcion.trim().length >= 3 &&
      this.fEmision !== '' &&
      this.fVence >= this.fEmision
    );
  }

  async emitir() {
    if (!this.formValido() || this.emitiendo()) return;
    this.emitiendo.set(true);
    this.mensaje.set(null);
    try {
      const f = await this.api.createInvoice({
        direction: this.direccion(),
        counterparty: this.fContraparte.trim(),
        issue_date: this.fEmision,
        due_date: this.fVence,
        amount: this.fMonto,
        account_code: this.fCuenta,
        description: this.fDescripcion.trim(),
        cost_center: this.fCostCenter || null,
        invoice_number: this.fNumero.trim() || null,
      });
      this.mensaje.set({ texto: `Factura emitida · asiento sellado`, error: false });
      this.limpiarForm();
      await this.cargar();
      this.status.refresh(); // la emisión postea al ledger
    } catch (e: any) {
      this.mensaje.set({
        texto: e?.error?.detail ?? 'No se pudo emitir la factura.',
        error: true,
      });
    } finally {
      this.emitiendo.set(false);
    }
  }

  iniciarPago(f: InvoiceOut) {
    this.accionId.set(f.id);
    this.accionTipo.set('pago');
    this.montoPago = f.outstanding;
  }

  iniciarVoid(f: InvoiceOut) {
    this.accionId.set(f.id);
    this.accionTipo.set('void');
    this.razonVoid = '';
  }

  cancelarAccion() {
    this.accionId.set(null);
    this.accionTipo.set(null);
  }

  async confirmarPago(f: InvoiceOut) {
    try {
      await this.api.registerPayment(f.id, {
        amount: this.montoPago,
        payment_date: new Date().toISOString().slice(0, 10),
      });
      this.cancelarAccion();
      await this.cargar();
      this.status.refresh(); // el pago postea al ledger
    } catch (e: any) {
      this.mensaje.set({
        texto: e?.error?.detail ?? 'No se pudo registrar el pago.',
        error: true,
      });
    }
  }

  async confirmarVoid(f: InvoiceOut) {
    if (this.razonVoid.trim().length < 3) return;
    try {
      await this.api.voidInvoice(f.id, this.razonVoid.trim());
      this.cancelarAccion();
      await this.cargar();
      this.status.refresh(); // la anulación postea el storno
    } catch (e: any) {
      this.mensaje.set({
        texto: e?.error?.detail ?? 'No se pudo anular la factura.',
        error: true,
      });
    }
  }

  private limpiarForm() {
    this.fContraparte = '';
    this.fNumero = '';
    this.fMonto = '';
    this.fCuenta = '';
    this.fCostCenter = '';
    this.fDescripcion = '';
    this.fEmision = new Date().toISOString().slice(0, 10);
    this.fVence = this.enTreintaDias();
  }

  private enTreintaDias(): string {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }

  etiquetaBucket(b: string): string {
    return b === 'current' ? 'Al día' : b === '90+' ? '+90 días' : `${b} días`;
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