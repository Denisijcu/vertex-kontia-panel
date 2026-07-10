import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './../../core/services/auth.service';

/**
 * Login — la portada del libro.
 *
 * Sin registro público: las credenciales las emite el administrador.
 * El copy y la estética siguen el lenguaje del ledger: no "inicias
 * sesión", abres el libro mayor.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="portada">
      <div class="libro">
        <div class="marca">
          <span class="display nombre">Kontia</span>
          <span class="lema cifra">PARTIDA DOBLE DESDE 1494 · AGENTE DESDE 2026</span>
        </div>

        <form (ngSubmit)="entrar()" class="formulario">
          <label>
            Email
            <input
              type="email"
              name="email"
              [(ngModel)]="email"
              autocomplete="email"
              placeholder="tu@vertexcoders.com"
              [disabled]="cargando()"
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              name="password"
              [(ngModel)]="password"
              autocomplete="current-password"
              placeholder="••••••••••"
              [disabled]="cargando()"
              required
            />
          </label>

          @if (error(); as msg) {
            <div class="error cifra">✕ {{ msg }}</div>
          }

          <button
            class="primaria abrir"
            type="submit"
            [disabled]="cargando() || !email || !password"
          >
            {{ cargando() ? 'Verificando…' : 'Abrir el libro mayor' }}
          </button>
        </form>

        <div class="pie cifra">
          Acceso restringido · Vertex Coders LLC
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .portada {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .libro {
        width: 100%;
        max-width: 400px;
        padding: 44px 38px 30px;
        background: var(--superficie);
        border: 1px solid var(--linea);
        border-top: 3px solid var(--laton);
        border-radius: var(--radio);
      }
      .marca {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        margin-bottom: 36px;
      }
      .nombre { font-size: 44px; color: var(--laton); line-height: 1; }
      .lema {
        font-size: 9.5px;
        letter-spacing: 0.18em;
        color: var(--papel-tenue);
        text-align: center;
      }
      .formulario { display: flex; flex-direction: column; gap: 18px; }
      label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 13px;
        color: var(--papel-tenue);
      }
      .error {
        font-size: 12px;
        color: var(--roto);
        border: 1px solid var(--roto);
        border-radius: 3px;
        padding: 9px 12px;
        text-align: left;
      }
      .abrir { margin-top: 6px; padding: 12px; font-size: 15px; }
      .pie {
        margin-top: 30px;
        text-align: center;
        font-size: 10px;
        letter-spacing: 0.12em;
        color: var(--papel-tenue);
      }
      /* ====================================================================
   LOGIN RESPONSIVE — la portada del libro en el bolsillo
   ==================================================================== */

/* Base: centrado robusto en móvil (dvh = altura real con barra del
   navegador; el keyboard no rompe el layout) */
.portada {
  min-height: 100dvh !important;
  padding: 16px !important;
  padding-top: max(16px, env(safe-area-inset-top)) !important;
  padding-bottom: max(16px, env(safe-area-inset-bottom)) !important;
}

.libro {
  width: 100% !important;
  max-width: 400px !important;
}

/* ---------- Móvil (≤ 480px) ---------- */
@media (max-width: 480px) {
  .portada { align-items: flex-start !important; padding-top: 8vh !important; }

  .libro {
    padding: 30px 20px 22px !important;
    border-left: none !important;
    border-right: none !important;
    border-radius: 0 !important;
    max-width: 100% !important;
  }

  .marca { margin-bottom: 26px !important; }
  .nombre { font-size: 34px !important; }
  .lema {
    font-size: 8.5px !important;
    letter-spacing: 0.14em !important;
    line-height: 1.6;
    max-width: 260px;
  }

  .formulario { gap: 15px !important; }
  .formulario label { font-size: 12px !important; }
  .formulario input { padding: 12px !important; }   /* dedo cómodo */

  .abrir {
    padding: 14px !important;
    font-size: 16px !important;
    width: 100%;
  }

  .error { font-size: 11px !important; }
  .pie { margin-top: 22px !important; font-size: 9px !important; }
}

/* ---------- Móvil chico (≤ 360px) ---------- */
@media (max-width: 360px) {
  .nombre { font-size: 29px !important; }
  .libro { padding: 24px 16px 18px !important; }
}

/* Teléfono en horizontal: que el form no quede cortado por el keyboard */
@media (max-height: 500px) and (orientation: landscape) {
  .portada { align-items: flex-start !important; padding-top: 12px !important; }
  .marca { margin-bottom: 16px !important; }
  .nombre { font-size: 26px !important; }
  .pie { display: none; }
}
    `,
    
  ],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  cargando = signal(false);
  error = signal<string | null>(null);

  async entrar() {
    if (!this.email || !this.password || this.cargando()) return;
    this.cargando.set(true);
    this.error.set(null);
    try {
      await this.auth.login(this.email.trim(), this.password);
      this.router.navigate(['/dashboard']);
    } catch (e: any) {
      this.error.set(
        e?.error?.detail ?? 'No se pudo verificar. ¿El backend está arriba?'
      );
    } finally {
      this.cargando.set(false);
    }
  }
}