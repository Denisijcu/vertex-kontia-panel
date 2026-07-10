import { Component, OnDestroy, inject, signal } from '@angular/core';
import { StatusService } from '../../core/services/status.service';

/**
 * Footer — línea de registro.
 *
 * Barra de estado estilo terminal financiera: cadena de auditoría,
 * eventos sellados, reloj UTC latiendo, versión. Ningún adorno;
 * cada elemento reporta algo verdadero del sistema.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="registro cifra">
      <div class="grupo">
        <span class="sello-marca">
          <span class="display k">K</span>ONTIA
        </span>
        <span class="sep">·</span>
        <span>v0.1.0</span>
        <span class="sep">·</span>
        <span class="lema">Partida doble desde 1494 · Agente desde 2026</span>
      </div>

      <div class="grupo">
        @if (status.chain(); as c) {
          <span class="estado" [class.ok]="c.valid" [class.mal]="!c.valid">
            {{ c.valid ? '● CADENA ÍNTEGRA' : '● CADENA ROTA' }}
          </span>
          <span class="sep">·</span>
          <span>{{ c.total_events }} eventos sellados</span>
        } @else {
          <span class="tenue">● verificando cadena…</span>
        }
        <span class="sep">·</span>
        <span title="Hora del ledger (UTC)">{{ utc() }} UTC</span>
        <span class="sep">·</span>
        <span class="tenue">© 2026 Vertex Coders LLC</span>
      </div>
    </footer>
  `,
  styles: [
    `
      .registro {
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 0 24px;
        border-top: 1px solid var(--linea);
        background: var(--superficie);
        font-size: 11px;
        letter-spacing: 0.05em;
        color: var(--papel-tenue);
        text-align: left;
        flex-wrap: wrap;
      }
      .grupo { display: flex; align-items: center; gap: 10px; white-space: nowrap; }
      .sello-marca { color: var(--laton); letter-spacing: 0.18em; font-weight: 600; }
      .sello-marca .k { font-size: 14px; letter-spacing: 0; }
      .sep { color: var(--linea); }
      .lema { font-style: normal; }
      .estado.ok  { color: var(--cuadrado); }
      .estado.mal { color: var(--roto); font-weight: 600; }
      .tenue { color: var(--papel-tenue); }
      @media (max-width: 800px) {
        .registro { height: auto; padding: 8px 14px; }
        .lema { display: none; }
      }
    `,
  ],
})
export class FooterComponent implements OnDestroy {
  status = inject(StatusService);

  utc = signal(this.ahora());
  private tick = setInterval(() => this.utc.set(this.ahora()), 1000);

  private ahora(): string {
    return new Date().toISOString().slice(11, 19);
  }

  ngOnDestroy(): void {
    clearInterval(this.tick);
  }
}