import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * 404 — Folio sin registrar.
 *
 * En Kontia un error también habla el idioma del ledger: la ruta
 * solicitada es un folio que no existe en el libro mayor. Estampa
 * roja (contraparte del sello CUADRADO) y vuelta al Dashboard.
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="folio">
      <div class="estampa">SIN REGISTRO</div>

      <div class="numero display">404</div>

      <h1 class="mensaje">Este folio no existe en el libro mayor</h1>
      <p class="detalle">
        La ruta solicitada no corresponde a ningún asiento, cuenta ni
        reporte registrado. Si llegaste aquí desde un enlace, es posible
        que haya sido revertido.
      </p>

      <div class="linea-ledger cifra">
        <span>FOLIO</span>
        <span class="puntos"></span>
        <span>404</span>
      </div>
      <div class="linea-ledger cifra">
        <span>ESTADO</span>
        <span class="puntos"></span>
        <span class="rojo">no posteado</span>
      </div>
      <div class="linea-ledger cifra">
        <span>HASH</span>
        <span class="puntos"></span>
        <span class="tenue">∅ — nada que sellar</span>
      </div>

      <a routerLink="/dashboard" class="volver">← Volver al Dashboard</a>
    </div>
  `,
  styles: [
    `
      .folio {
        max-width: 520px;
        margin: 8vh auto 0;
        padding: 40px 36px;
        position: relative;
        border: 1px solid var(--linea);
        border-radius: var(--radio);
        background: var(--superficie);
        text-align: center;
      }
      .estampa {
        position: absolute;
        top: 22px;
        right: 24px;
        font-family: var(--f-cifras);
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.22em;
        padding: 6px 14px;
        border: 1.5px solid var(--roto);
        color: var(--roto);
        border-radius: 3px;
        transform: rotate(6deg);
        opacity: 0.9;
      }
      .numero {
        font-size: 96px;
        line-height: 1;
        color: var(--laton);
        letter-spacing: 0.04em;
        margin-bottom: 12px;
      }
      .mensaje {
        font-size: 19px;
        font-weight: 600;
        margin-bottom: 10px;
      }
      .detalle {
        font-size: 14px;
        color: var(--papel-tenue);
        margin-bottom: 28px;
        line-height: 1.6;
      }
      .linea-ledger {
        display: flex;
        align-items: baseline;
        gap: 10px;
        font-size: 12px;
        letter-spacing: 0.08em;
        color: var(--papel);
        padding: 7px 4px;
        border-bottom: 1px solid var(--linea);
        text-align: left;
      }
      .linea-ledger:last-of-type { margin-bottom: 30px; }
      .puntos {
        flex: 1;
        border-bottom: 1px dotted var(--linea);
        transform: translateY(-3px);
      }
      .rojo { color: var(--roto); }
      .tenue { color: var(--papel-tenue); }
      .volver {
        display: inline-block;
        font-size: 14px;
        color: var(--laton);
        text-decoration: none;
        padding: 10px 20px;
        border: 1px solid var(--linea);
        border-radius: var(--radio);
        transition: border-color 120ms ease;
      }
      .volver:hover { border-color: var(--laton); }
      @media (max-width: 800px) {
        .folio { margin: 4vh 16px 0; padding: 32px 22px; }
        .numero { font-size: 72px; }
        .estampa { top: 14px; right: 14px; font-size: 10px; }
      }
    `,
  ],
})
export class NotFoundComponent {}