import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { KontiaApi, TenantUser } from '../../core/services/kontia-api.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="eyebrow">Usuarios del tenant · solo owner</div>
    <h1 class="titulo">Usuarios</h1>

    <section class="card form-invitar">
      <div class="eyebrow">Invitar usuario</div>
      <form (ngSubmit)="invitar()">
        <div class="fila-form">
          <input
            type="email"
            placeholder="Email"
            [(ngModel)]="nuevoEmail"
            name="email"
            required
          />
          <input
            type="text"
            placeholder="Nombre completo"
            [(ngModel)]="nuevoNombre"
            name="nombre"
            required
          />
          <input
            type="password"
            placeholder="Contraseña (mín. 8 caracteres)"
            [(ngModel)]="nuevaPassword"
            name="password"
            minlength="8"
            required
          />
          <select [(ngModel)]="nuevoRol" name="rol">
            <option value="viewer">viewer</option>
            <option value="accountant">accountant</option>
            <option value="owner">owner</option>
          </select>
          <button type="submit" [disabled]="invitando()">
            {{ invitando() ? 'Invitando…' : 'Invitar' }}
          </button>
        </div>
        @if (errorInvitar()) {
          <p class="error">{{ errorInvitar() }}</p>
        }
      </form>
    </section>

    @if (cargando()) {
      <section class="card tenue">Consultando usuarios…</section>
    } @else {
      <section class="card">
        <table>
          <thead>
            <tr><th>Email</th><th>Nombre</th><th>Rol</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            @for (u of usuarios(); track u.id) {
              <tr>
                <td>{{ u.email }}</td>
                <td>{{ u.full_name }}</td>
                <td>
                  <select
                    [ngModel]="u.role"
                    (ngModelChange)="cambiarRol(u, $event)"
                    [disabled]="!u.is_active || cambiandoRol() === u.id"
                    name="rol-{{ u.id }}"
                  >
                    <option value="viewer">viewer</option>
                    <option value="accountant">accountant</option>
                    <option value="owner">owner</option>
                  </select>
                </td>
                <td>
                  <span class="estado" [class.rev]="!u.is_active">
                    {{ u.is_active ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  @if (u.is_active && u.id !== miId()) {
                    <button
                      class="btn-desactivar"
                      (click)="desactivar(u)"
                      [disabled]="desactivando() === u.id"
                    >
                      {{ desactivando() === u.id ? '…' : 'Desactivar' }}
                    </button>
                  }
                  @if (!u.is_active) {
                    <button
                      class="btn-reactivar"
                      (click)="reactivar(u)"
                      [disabled]="reactivando() === u.id"
                    >
                      {{ reactivando() === u.id ? '…' : 'Reactivar' }}
                    </button>
                  }
                  @if (u.id === miId()) {
                    <span class="tenue">(tú)</span>
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
    .form-invitar { margin-bottom: 20px; }
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
    .fila-form input[type="email"] { flex: 2; min-width: 180px; }
    .fila-form input[type="text"] { flex: 2; min-width: 160px; }
    .fila-form input[type="password"] { flex: 2; min-width: 180px; }
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
    .estado { font-family: var(--f-cifras); font-size: 12px; color: var(--cuadrado); }
    .estado.rev { color: var(--roto); }
    select {
      background: var(--superficie-2);
      border: 1px solid var(--linea);
      border-radius: var(--radio);
      color: var(--papel);
      padding: 5px 8px;
      font-size: 12px;
    }
    .btn-desactivar {
      font-size: 12px;
      padding: 6px 12px;
      border-radius: var(--radio);
      border: 1px solid var(--roto);
      background: transparent;
      color: var(--roto);
      cursor: pointer;
    }
    .btn-desactivar:hover { background: var(--roto); color: var(--tinta); }
    .btn-desactivar:disabled { opacity: 0.5; cursor: default; }
    .btn-reactivar {
      font-size: 12px;
      padding: 6px 12px;
      border-radius: var(--radio);
      border: 1px solid var(--cuadrado);
      background: transparent;
      color: var(--cuadrado);
      cursor: pointer;
    }
    .btn-reactivar:hover { background: var(--cuadrado); color: var(--tinta); }
    .btn-reactivar:disabled { opacity: 0.5; cursor: default; }
  `],
})
export class UsuariosComponent {
  private api = inject(KontiaApi);
  private auth = inject(AuthService);

  usuarios = signal<TenantUser[]>([]);
  cargando = signal(true);
  invitando = signal(false);
  cambiandoRol = signal<string | null>(null);
  desactivando = signal<string | null>(null);
  reactivando = signal<string | null>(null);
  errorInvitar = signal<string | null>(null);

  nuevoEmail = '';
  nuevoNombre = '';
  nuevaPassword = '';
  nuevoRol: 'owner' | 'accountant' | 'viewer' = 'viewer';

  miId = () => this.auth.user()?.id ?? '';

  constructor() {
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    this.api.tenantUsers()
      .then((u) => this.usuarios.set(u))
      .finally(() => this.cargando.set(false));
  }

  async invitar() {
    if (!this.nuevoEmail || !this.nuevoNombre || this.nuevaPassword.length < 8) return;
    this.invitando.set(true);
    this.errorInvitar.set(null);
    try {
      await this.api.createTenantUser({
        email: this.nuevoEmail,
        full_name: this.nuevoNombre,
        password: this.nuevaPassword,
        role: this.nuevoRol,
      });
      this.nuevoEmail = '';
      this.nuevoNombre = '';
      this.nuevaPassword = '';
      this.nuevoRol = 'viewer';
      this.cargar();
    } catch (e: any) {
      this.errorInvitar.set(e?.error?.detail ?? 'No se pudo invitar al usuario.');
    } finally {
      this.invitando.set(false);
    }
  }

  async cambiarRol(u: TenantUser, nuevoRol: string) {
    if (nuevoRol === u.role) return;
    this.cambiandoRol.set(u.id);
    try {
      await this.api.updateUserRole(u.id, nuevoRol);
      this.cargar();
    } catch (e: any) {
      alert(e?.error?.detail ?? 'No se pudo cambiar el rol.');
    } finally {
      this.cambiandoRol.set(null);
    }
  }

  async desactivar(u: TenantUser) {
    if (!confirm(`¿Desactivar a ${u.email}?`)) return;
    this.desactivando.set(u.id);
    try {
      await this.api.deactivateUser(u.id);
      this.cargar();
    } catch (e: any) {
      alert(e?.error?.detail ?? 'No se pudo desactivar.');
    } finally {
      this.desactivando.set(null);
    }
  }

  async reactivar(u: TenantUser) {
    this.reactivando.set(u.id);
    try {
      await this.api.reactivateUser(u.id);
      this.cargar();
    } catch (e: any) {
      alert(e?.error?.detail ?? 'No se pudo reactivar.');
    } finally {
      this.reactivando.set(null);
    }
  }
}