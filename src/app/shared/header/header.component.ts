import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { StatusService } from '../../core/services/status.service';


/**
 * Header — barra de instrumento.
 *
 * Lleva la Ecuación Viva (A = P + PN en miniatura) visible en TODA
 * pantalla: la promesa central del producto nunca sale del ojo.
 * Derecha: período fiscal activo, el semáforo maestro de integridad,
 * quién está logueado, y el botón de salir.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="barra">
      <div class="lado-izq">
        <span class="marca-mini display">K</span>
        <span class="divisor"></span>

        @if (status.balance(); as b) {
          <div class="ecuacion-viva cifra" [title]="'Ecuación fundamental verificada por transacción'">
            <span class="ec-letra">A</span>
            <span class="ec-valor">{{ compacto(b.total_assets) }}</span>
            <span class="ec-op">=</span>
            <span class="ec-letra">P</span>
            <span class="ec-valor">{{ compacto(b.total_liabilities) }}</span>
            <span class="ec-op">+</span>
            <span class="ec-letra">PN</span>
            <span class="ec-valor">{{ compacto(b.total_equity) }}</span>
          </div>
        } @else {
          <span class="ecuacion-viva cifra tenue">A = P + PN</span>
        }
      </div>

      <div class="lado-der">
        <span class="chip cifra" title="Período fiscal activo">{{ periodo }}</span>
        <span class="chip cifra tenue">{{ hoy }}</span>
        <span
          class="semaforo"
          [class.ok]="status.integro() === true"
          [class.mal]="status.integro() === false"
          [class.pulso]="status.verificando()"
          [title]="titulo()"
        ></span>
        <span class="divisor"></span>
        @if (auth.user(); as u) {
          <span class="usuario tenue" [title]="u.email">{{ u.full_name }}</span>
        }
        <button class="btn-salir" (click)="auth.logout()" title="Cerrar sesión">
          Salir
        </button>
      </div>
    </header>
  `,
  styles: [
    `
      .barra {
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 24px;
        border-bottom: 1px solid var(--linea);
        background: color-mix(in srgb, var(--tinta) 88%, transparent);
        backdrop-filter: blur(8px);
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .lado-izq, .lado-der { display: flex; align-items: center; gap: 14px; }
      .marca-mini {
        font-size: 22px;
        color: var(--laton);
        line-height: 1;
        padding-bottom: 3px;
      }
      .divisor { width: 1px; height: 22px; background: var(--linea); }
      .ecuacion-viva {
        display: flex;
        align-items: baseline;
        gap: 7px;
        font-size: 13px;
        text-align: left;
      }
      .ec-letra {
        font-family: var(--f-display);
        font-style: italic;
        font-size: 12px;
        color: var(--laton);
      }
      .ec-valor { color: var(--papel); }
      .ec-op { color: var(--papel-tenue); }
      .tenue { color: var(--papel-tenue); }
      .chip {
        font-size: 12px;
        padding: 4px 10px;
        border: 1px solid var(--linea);
        border-radius: 3px;
        letter-spacing: 0.06em;
        text-align: left;
      }
      .semaforo {
        width: 10px; height: 10px; border-radius: 50%;
        background: var(--papel-tenue);
        transition: background 200ms ease;
      }
      .semaforo.ok  { background: var(--cuadrado); box-shadow: 0 0 8px color-mix(in srgb, var(--cuadrado) 60%, transparent); }
      .semaforo.mal { background: var(--roto);     box-shadow: 0 0 8px color-mix(in srgb, var(--roto) 60%, transparent); }
      .semaforo.pulso { animation: latido 1.2s ease-in-out infinite; }
      @keyframes latido { 50% { opacity: 0.35; } }
      .usuario {
        font-size: 12px;
        max-width: 140px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .btn-salir {
        font-size: 12px;
        padding: 5px 12px;
        border-radius: 3px;
        border: 1px solid var(--linea);
        background: transparent;
        color: var(--papel-tenue);
        cursor: pointer;
        letter-spacing: 0.04em;
      }
      .btn-salir:hover {
        border-color: var(--roto);
        color: var(--roto);
      }
      @media (max-width: 800px) {
        .barra { padding: 0 14px; }
        .ecuacion-viva { display: none; }
        .usuario { display: none; }
      }
    `,
  ],
})
export class HeaderComponent {
  status = inject(StatusService);
  auth = inject(AuthService);

  hoy = new Date().toISOString().slice(0, 10);
  periodo = this.hoy.slice(0, 7); // períodos mensuales: 2026-07

  titulo = computed(() => {
    const i = this.status.integro();
    if (i === true) return 'Ecuación cuadrada · cadena de auditoría íntegra';
    if (i === false) return 'ATENCIÓN: integridad comprometida';
    return 'Verificando integridad…';
  });

  /** Formato compacto para el chrome: $5,000 → $5.0K; exactitud vive en Dashboard. */
  compacto(v: string): string {
    const n = parseFloat(v);
    if (isNaN(n)) return '—';
    const abs = Math.abs(n);
    const signo = n < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${signo}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 10_000) return `${signo}$${(abs / 1_000).toFixed(1)}K`;
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }
}