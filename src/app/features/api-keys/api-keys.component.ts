
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiKey, ApiKeyCreated, KontiaApi } from '../../core/services/kontia-api.service';

@Component({
  selector: 'app-api-keys',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="eyebrow">Credenciales para agentes MCP · solo owner</div>
    <h1 class="titulo">API Keys</h1>

    @if (creada(); as c) {
      <section class="card sello-key">
        <div class="eyebrow">Key creada — cópiala ahora, no se vuelve a mostrar</div>
        <div class="fila-key">
          <code class="plain-key">{{ c.plain_key }}</code>
          <button class="btn-copiar" (click)="copiar(c.plain_key)">
            {{ copiado() ? '¡Copiada!' : 'Copiar' }}
          </button>
        </div>
        <p class="tenue">
          Nombre: {{ c.name }} · Rol: {{ c.role }} · Prefijo visible después: {{ c.key_prefix }}…
        </p>
        <button class="btn-cerrar" (click)="creada.set(null)">Entendido, cerrar</button>
      </section>
    }

    <section class="card form-crear">
      <div class="eyebrow">Crear nueva key</div>
      <form (ngSubmit)="crear()">
        <div class="fila-form">
          <input
            type="text"
            placeholder="Nombre (ej. 'Agente contable de Denis')"
            [(ngModel)]="nuevoNombre"
            name="nombre"
            required
            minlength="3"
          />
          <select [(ngModel)]="nuevoRol" name="rol">
            <option value="viewer">viewer</option>
            <option value="accountant">accountant</option>
            <option value="owner">owner</option>
          </select>
          <button type="submit" [disabled]="creando()">
            {{ creando() ? 'Creando…' : 'Crear key' }}
          </button>
        </div>
        @if (errorCrear()) {
          <p class="error">{{ errorCrear() }}</p>
        }
      </form>
    </section>

    @if (cargando()) {
      <section class="card tenue">Consultando keys…</section>
    } @else if (keys().length === 0) {
      <section class="card tenue">Sin keys creadas todavía.</section>
    } @else {
      <section class="card">
        <table>
          <thead>
            <tr>
              <th>Nombre</th><th>Prefijo</th><th>Rol</th><th>Estado</th>
              <th>Creada</th><th>Último uso</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (k of keys(); track k.id) {
              <tr>
                <td>{{ k.name }}</td>
                <td class="cifra hash">{{ k.key_prefix }}…</td>
                <td><span class="chip">{{ k.role }}</span></td>
                <td>
                  <span class="estado" [class.rev]="!k.is_active">
                    {{ k.is_active ? 'Activa' : 'Revocada' }}
                  </span>
                </td>
                <td class="cifra tenue">{{ k.created_at.slice(0, 10) }}</td>
                <td class="cifra tenue">
                  {{ k.last_used_at ? k.last_used_at.slice(0, 10) : 'nunca' }}
                </td>
                <td>
                  @if (k.is_active) {
                    <button
                      class="btn-revocar"
                      (click)="revocar(k)"
                      [disabled]="revocando() === k.id"
                    >
                      {{ revocando() === k.id ? '…' : 'Revocar' }}
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
    .chip {
      font-family: var(--f-cifras); font-size: 11px;
      border: 1px solid var(--linea); border-radius: 3px; padding: 2px 8px;
    }
    .hash { font-size: 11px; color: var(--laton); }
    .estado { font-family: var(--f-cifras); font-size: 12px; color: var(--cuadrado); }
    .estado.rev { color: var(--roto); }
    /* --- Sello de key creada (one-time reveal) --- */
    .sello-key {
      border-color: var(--laton);
      margin-bottom: 20px;
    }
    .fila-key {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
      margin-bottom: 10px;
    }
    .plain-key {
      flex: 1;
      background: var(--tinta);
      border: 1px solid var(--laton);
      border-radius: var(--radio);
      padding: 10px 14px;
      font-size: 13px;
      color: var(--laton);
      overflow-x: auto;
      white-space: nowrap;
    }
    .btn-copiar, .btn-cerrar {
      font-size: 12px;
      padding: 8px 14px;
      border-radius: var(--radio);
      border: 1px solid var(--laton);
      background: var(--laton);
      color: var(--tinta);
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .btn-cerrar {
      background: transparent;
      color: var(--laton);
      margin-top: 4px;
    }
    /* --- Form de creación --- */
    .form-crear { margin-bottom: 20px; }
    .fila-form {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 10px;
    }
    .fila-form input, .fila-form select {
      background: var(--superficie-2);
      border: 1px solid var(--linea);
      border-radius: var(--radio);
      color: var(--papel);
      padding: 8px 10px;
      font-size: 13px;
    }
    .fila-form input { flex: 2; min-width: 220px; }
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
    .error { color: var(--roto); font-size: 13px; margin-top: 8px; }
    .btn-revocar {
      font-size: 12px;
      padding: 6px 12px;
      border-radius: var(--radio);
      border: 1px solid var(--roto);
      background: transparent;
      color: var(--roto);
      cursor: pointer;
    }
    .btn-revocar:hover { background: var(--roto); color: var(--tinta); }
    .btn-revocar:disabled { opacity: 0.5; cursor: default; }
  `],
})
export class ApiKeysComponent {
  private api = inject(KontiaApi);

  keys = signal<ApiKey[]>([]);
  cargando = signal(true);
  creando = signal(false);
  revocando = signal<string | null>(null);
  errorCrear = signal<string | null>(null);
  creada = signal<ApiKeyCreated | null>(null);
  copiado = signal(false);

  nuevoNombre = '';
  nuevoRol: 'owner' | 'accountant' | 'viewer' = 'viewer';

  constructor() {
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    this.api.apiKeys()
      .then((k) => this.keys.set(k))
      .finally(() => this.cargando.set(false));
  }

  async crear() {
    if (!this.nuevoNombre || this.nuevoNombre.length < 3) return;
    this.creando.set(true);
    this.errorCrear.set(null);
    try {
      const key = await this.api.createApiKey(this.nuevoNombre, this.nuevoRol);
      this.creada.set(key);
      this.nuevoNombre = '';
      this.nuevoRol = 'viewer';
      this.cargar();
    } catch (e: any) {
      this.errorCrear.set(e?.error?.detail ?? 'No se pudo crear la key.');
    } finally {
      this.creando.set(false);
    }
  }

  async revocar(k: ApiKey) {
    if (!confirm(`¿Revocar "${k.name}"? Cualquier agente usándola perderá acceso de inmediato.`)) {
      return;
    }
    this.revocando.set(k.id);
    try {
      await this.api.revokeApiKey(k.id);
      this.cargar();
    } catch (e: any) {
      alert(e?.error?.detail ?? 'No se pudo revocar.');
    } finally {
      this.revocando.set(null);
    }
  }

  async copiar(plainKey: string) {
    try {
      await navigator.clipboard.writeText(plainKey);
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    } catch {
      // Clipboard API puede fallar sin HTTPS/permiso; el texto sigue
      // visible y seleccionable a mano como respaldo.
    }
  }
}