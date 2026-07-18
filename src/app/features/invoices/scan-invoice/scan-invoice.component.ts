import { Component, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment.prod';

/** Respuesta de POST /mobile/scan-invoice (confirmada contra mobile.py). */
interface ExtraccionInvoice {
  es_factura: boolean | null;
  proveedor: string | null;
  nit_o_id: string | null;
  numero_factura: string | null;
  fecha: string | null;
  moneda: string | null;
  monto_total: string | null;
  concepto: string | null;
  confianza: number | null;
  notas: string | null;
}

interface ScanInvoiceResponse {
  extraccion: ExtraccionInvoice | null;
  proposal_id: string | null;
  cuenta_propuesta: string | null;
  centro_costo_propuesto: string | null;
  confianza_clasificacion: number | null;
  mensaje: string | null;
}

// Reglas del backend (mobile.py): solo imágenes, máx 8MB, NO PDF todavía.
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 8 * 1024 * 1024;

@Component({
  selector: 'app-scan-invoice',
  standalone: true,
  template: `
    <div class="scan-card">
      <h3 class="scan-title">Escanear factura con IA</h3>
      <p class="scan-subtitle">
        Sube la foto de una factura. Vision la lee, el agente propone la
        clasificación y queda en la cola de revisión — nada se postea solo.
      </p>

      <!-- Zona de drop / selección -->
      <div
        class="dropzone"
        [class.drag-over]="dragOver()"
        (dragover)="onDragOver($event)"
        (dragleave)="dragOver.set(false)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
      >
        @if (previewUrl()) {
          <img [src]="previewUrl()" alt="Factura" class="preview-img" />
        } @else {
          <div class="dropzone-hint">
            <span class="dropzone-icon">🧾</span>
            <span>Arrastra la imagen aquí o haz clic para elegirla</span>
            <span class="dropzone-formats">JPG · PNG · WEBP · GIF — máx 8MB</span>
          </div>
        }
        <input
          #fileInput
          type="file"
          [accept]="acceptTypes"
          hidden
          (change)="onFilePicked($event)"
        />
      </div>

      @if (errorMsg()) {
        <p class="scan-error">{{ errorMsg() }}</p>
      }

      <div class="scan-actions">
        <button
          class="btn-primary"
          [disabled]="!file() || uploading()"
          (click)="upload()"
        >
          {{ uploading() ? 'Analizando con Vision…' : 'Subir factura' }}
        </button>
        @if (file() || result()) {
          <button class="btn-ghost" [disabled]="uploading()" (click)="reset()">
            Limpiar
          </button>
        }
      </div>

      <!-- Resultado -->
      @if (result(); as r) {
        <div class="result-card" [class.warning]="r.extraccion?.es_factura === false">
          @if (r.extraccion?.es_factura === false) {
            <p class="result-title">⚠️ La IA no está segura de que esto sea una factura</p>
          } @else {
            <p class="result-title">✅ Propuesta creada en la cola de revisión</p>
          }

          @if (r.mensaje) { <p class="result-msg">{{ r.mensaje }}</p> }
          @if (r.proposal_id) {
            <p class="result-meta">ID de propuesta: {{ r.proposal_id }}</p>
          }

          @if (r.extraccion; as e) {
            <dl class="result-grid">
              @if (e.proveedor)       { <dt>Proveedor</dt><dd>{{ e.proveedor }}</dd> }
              @if (e.nit_o_id)        { <dt>NIT/ID</dt><dd>{{ e.nit_o_id }}</dd> }
              @if (e.numero_factura)  { <dt>N.º factura</dt><dd>{{ e.numero_factura }}</dd> }
              @if (e.fecha)           { <dt>Fecha</dt><dd>{{ e.fecha }}</dd> }
              @if (e.monto_total)     { <dt>Monto</dt><dd>{{ e.monto_total }} {{ e.moneda ?? '' }}</dd> }
              @if (e.concepto)        { <dt>Concepto</dt><dd>{{ e.concepto }}</dd> }
              @if (e.confianza !== null) {
                <dt>Confianza extracción</dt><dd>{{ (e.confianza * 100).toFixed(0) }}%</dd>
              }
            </dl>
            @if (e.notas) { <p class="result-notes">{{ e.notas }}</p> }
          }

          @if (r.cuenta_propuesta || r.centro_costo_propuesto) {
            <div class="result-classification">
              <span class="result-label">Clasificación propuesta:</span>
              @if (r.cuenta_propuesta)         { <span>Cuenta {{ r.cuenta_propuesta }}</span> }
              @if (r.centro_costo_propuesto)   { <span>· {{ r.centro_costo_propuesto }}</span> }
              @if (r.confianza_clasificacion !== null) {
                <span>· {{ (r.confianza_clasificacion! * 100).toFixed(0) }}%</span>
              }
            </div>
          }

          <p class="result-footer">
            Revísala y apruébala desde la sección <strong>Agent</strong> para postearla.
          </p>
        </div>
      }
    </div>
  `,
  styles: [`
    .scan-card {
      background: #12181f;
      border: 1px solid #263143;
      border-radius: 16px;
      padding: 20px;
      color: #e8e6df;
    }
    .scan-title { margin: 0 0 4px; color: #c9a34e; font-size: 1.05rem; }
    .scan-subtitle { margin: 0 0 16px; color: #8b96a3; font-size: .85rem; }

    .dropzone {
      border: 2px dashed #263143;
      border-radius: 12px;
      min-height: 180px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: border-color .15s, background .15s;
      overflow: hidden;
    }
    .dropzone:hover, .dropzone.drag-over {
      border-color: #c9a34e;
      background: rgba(201, 163, 78, .05);
    }
    .dropzone-hint {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      color: #8b96a3; font-size: .9rem; padding: 24px; text-align: center;
    }
    .dropzone-icon { font-size: 2rem; }
    .dropzone-formats { font-size: .75rem; opacity: .7; }
    .preview-img { max-height: 320px; max-width: 100%; object-fit: contain; }

    .scan-error { color: #ef4444; font-size: .85rem; margin: 10px 0 0; }

    .scan-actions { display: flex; gap: 10px; margin-top: 14px; }
    .btn-primary {
      background: #c9a34e; color: #1f1706; border: none;
      padding: 10px 18px; border-radius: 10px; font-weight: 600; cursor: pointer;
    }
    .btn-primary:disabled { opacity: .5; cursor: default; }
    .btn-ghost {
      background: transparent; color: #8b96a3;
      border: 1px solid #263143; padding: 10px 18px; border-radius: 10px; cursor: pointer;
    }

    .result-card {
      margin-top: 18px; padding: 16px;
      background: #1b2530; border-radius: 12px; border: 1px solid #263143;
    }
    .result-card.warning { border-color: #f59e0b; }
    .result-title { margin: 0 0 8px; font-weight: 600; }
    .result-msg { margin: 0 0 6px; font-size: .9rem; }
    .result-meta { margin: 0 0 10px; font-size: .78rem; color: #8b96a3; }
    .result-grid {
      display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; margin: 0;
      font-size: .88rem;
    }
    .result-grid dt { color: #8b96a3; }
    .result-grid dd { margin: 0; font-variant-numeric: tabular-nums; }
    .result-notes { margin: 10px 0 0; font-size: .8rem; color: #8b96a3; font-style: italic; }
    .result-classification {
      margin-top: 12px; display: flex; gap: 6px; flex-wrap: wrap;
      font-size: .88rem; color: #3ecf8e;
    }
    .result-label { color: #8b96a3; }
    .result-footer { margin: 12px 0 0; font-size: .8rem; color: #8b96a3; }
  `],
})
export class ScanInvoiceComponent {
  private readonly http = inject(HttpClient);

  readonly acceptTypes = TIPOS_PERMITIDOS.join(',');

  readonly file = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly uploading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly result = signal<ScanInvoiceResponse | null>(null);
  readonly dragOver = signal(false);

  onDragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.dragOver.set(true);
  }

  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.dragOver.set(false);
    const f = ev.dataTransfer?.files?.[0];
    if (f) this.setFile(f);
  }

  onFilePicked(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (f) this.setFile(f);
    (ev.target as HTMLInputElement).value = ''; // permite re-elegir el mismo archivo
  }

  private setFile(f: File): void {
    // Validación en cliente con las MISMAS reglas del backend (mobile.py):
    // así el usuario ve el error al instante, sin gastar el round-trip.
    if (!TIPOS_PERMITIDOS.includes(f.type)) {
      this.errorMsg.set('Formato no soportado. Usa JPG, PNG, WEBP o GIF (PDF todavía no).');
      return;
    }
    if (f.size > MAX_BYTES) {
      this.errorMsg.set(`La imagen pesa ${(f.size / 1024 / 1024).toFixed(1)}MB — el máximo es 8MB.`);
      return;
    }
    this.errorMsg.set(null);
    this.result.set(null);
    this.file.set(f);

    const prev = this.previewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.previewUrl.set(URL.createObjectURL(f));
  }

  upload(): void {
    const f = this.file();
    if (!f || this.uploading()) return;

    const form = new FormData();
    form.append('file', f, f.name);

    this.uploading.set(true);
    this.errorMsg.set(null);

    this.http
      .post<ScanInvoiceResponse>(`${environment.apiUrl}/mobile/scan-invoice`, form)
      .subscribe({
        next: (res) => {
          this.result.set(res);
          this.uploading.set(false);
        },
        error: (err) => {
          this.uploading.set(false);
          this.errorMsg.set(
            err?.error?.detail ??
              'No se pudo procesar la factura. Revisa tu conexión e intenta de nuevo.',
          );
        },
      });
  }

  reset(): void {
    const prev = this.previewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.file.set(null);
    this.previewUrl.set(null);
    this.result.set(null);
    this.errorMsg.set(null);
  }
}