import { Component, inject, signal } from '@angular/core';
import { KontiaApi } from '../../core/services/kontia-api.service';

@Component({
  selector: 'app-conciliacion',
  standalone: true,
  template: `
    <div class="eyebrow">Conciliación bancaria · extracción con Claude · validación por saldo corrido</div>
    <h1 class="titulo">Conciliación</h1>

    <!-- ============ IMPORT ============ -->
    <section class="card importar">
      <div class="eyebrow">Importar estado de cuenta (PDF digital)</div>
      <div class="import-fila">
        <input
          type="file"
          accept="application/pdf"
          #fileInput
          (change)="archivoSeleccionado($event)"
        />
        <button class="primaria" (click)="importar()" [disabled]="importando() || !archivo()">
          {{ importando() ? 'Extrayendo y validando…' : 'Importar y conciliar' }}
        </button>
      </div>
      <p class="hint">
        Solo PDFs con capa de texto (descargados de la banca en línea).
        La sesión se rechaza completa si los saldos no cuadran fila a fila.
      </p>
      @if (error(); as e) {
        <p class="import-error">{{ e }}</p>
      }
    </section>

    <!-- ============ SESIONES ANTERIORES ============ -->
    @if (!sesionActual() && sesiones().length > 0) {
      <section class="card">
        <div class="eyebrow">Sesiones anteriores</div>
        <table>
          <thead>
            <tr><th>Banco</th><th>Período</th><th class="cifra">Saldo final</th><th></th></tr>
          </thead>
          <tbody>
            @for (s of sesiones(); track s.id) {
              <tr>
                <td>{{ s.bank_name }}</td>
                <td>{{ s.period_start }} → {{ s.period_end }}</td>
                <td class="cifra">{{ fmtNum(s.closing_balance) }}</td>
                <td><button (click)="abrirSesion(s.id)">Abrir</button></td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    }

    <!-- ============ SESIÓN ACTIVA ============ -->
    @if (sesionActual(); as ses) {
      <section class="card">
        <div class="eyebrow">
          {{ ses.bank_name }} · {{ ses.period_start }} → {{ ses.period_end }}
          <button class="volver" (click)="cerrarSesion()">← sesiones</button>
        </div>
        <div class="resumen-strip">
          <div class="bucket">
            <span class="bucket-nombre">Saldo inicial</span>
            <span class="cifra bucket-total">{{ fmtNum(ses.opening_balance) }}</span>
          </div>
          <div class="bucket">
            <span class="bucket-nombre">Saldo final</span>
            <span class="cifra bucket-total">{{ fmtNum(ses.closing_balance) }}</span>
          </div>
          <div class="bucket ok">
            <span class="bucket-nombre">Conciliados</span>
            <span class="cifra bucket-total">{{ contar('matched') }}</span>
          </div>
          <div class="bucket pend">
            <span class="bucket-nombre">Pendientes</span>
            <span class="cifra bucket-total">{{ contar('pending') }}</span>
          </div>
          <div class="bucket">
            <span class="bucket-nombre">Personales</span>
            <span class="cifra bucket-total">{{ contar('personal') }}</span>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="eyebrow">Movimientos del banco</div>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th class="cifra">Monto</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (i of items(); track i.id) {
              <tr [class.fila-personal]="i.status === 'personal'">
                <td>{{ i.txn_date }}</td>
                <td class="desc">
                  {{ i.description }}
                  @if (i.suggested_status === 'personal' && i.status === 'pending') {
                    <div class="sugerencia">¿Personal recurrente?</div>
                  }
                  <!-- ===== GUARDIÁN DE DUPLICADOS ===== -->
                  @if (advertenciaId() === i.id) {
                    <div class="guardian">
                      <div class="guardian-titulo">
                        ⚠ Posible duplicado — ya existe en Kontia:
                      </div>
                      @for (c of candidatos(); track c.entry_no) {
                        <div class="guardian-candidato">
                          #{{ c.entry_no }} · {{ c.entry_date }} · {{ c.description }}
                        </div>
                      }
                      <div class="guardian-acciones">
                        <button class="primaria" (click)="marcarDesdeGuardian(i, 'resolved')">
                          Es ese — marcar conciliado ✓
                        </button>
                        <button (click)="registrarDeTodasFormas(i)">
                          No es ese — registrar de todas formas
                        </button>
                        <button (click)="cerrarGuardian()">Cancelar</button>
                      </div>
                    </div>
                  }
                </td>
                <td class="cifra" [class.deposito]="i.amount > 0">{{ fmtNum(i.amount) }}</td>
                <td><span class="estado" [class]="'estado ' + i.status">{{ i.status }}</span></td>
                <td class="celda-acciones">
                  @if (i.status === 'pending') {
                    <button (click)="marcar(i, 'personal')">Es personal</button>
                    <button (click)="registrarConGuardian(i)" [disabled]="verificando() === i.id">
                      {{ verificando() === i.id ? 'Verificando…' : 'Registrar' }}
                    </button>
                    <button (click)="marcar(i, 'resolved')" title="Ya está registrado en Kontia">✓</button>
                  } @else if (i.status === 'personal') {
                    <button (click)="marcar(i, 'pending')">Deshacer</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
        <p class="hint nota-registro">
          "Registrar" verifica primero si ya existe un asiento del mismo
          monto en ±14 días — si hay candidatos, te pregunta antes de
          crear un duplicado.
        </p>
      </section>
    }
  `,
  styles: [
    `
      .titulo { margin-bottom: 24px; }
      .card { margin-bottom: 20px; }
      .import-fila { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
      .import-fila input[type='file'] {
        flex: 1; min-width: 240px; padding: 8px;
        font-size: 13px; border: 1px dashed var(--linea);
      }
      .hint { margin-top: 10px; font-size: 12px; color: var(--papel-tenue); }
      .import-error { margin-top: 12px; color: var(--roto); font-size: 13px; }
      .volver {
        float: right; padding: 3px 10px; min-height: 28px;
        font-size: 12px; margin-top: -4px;
      }
      /* Resumen */
      .resumen-strip { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 10px; }
      .bucket {
        flex: 1; min-width: 110px;
        display: flex; flex-direction: column; gap: 4px;
        padding: 12px; border: 1px solid var(--linea);
        border-radius: var(--radio); background: var(--superficie-2);
      }
      .bucket.ok { border-color: var(--cuadrado); }
      .bucket.pend { border-color: var(--pendiente); }
      .bucket-nombre {
        font-size: 11px; text-transform: uppercase;
        letter-spacing: 0.1em; color: var(--papel-tenue);
      }
      .bucket-total { font-size: 18px; text-align: left; }
      /* Tabla */
      .desc { max-width: 480px; }
      .sugerencia { font-size: 11px; color: var(--pendiente); margin-top: 2px; }
      .deposito { color: var(--cuadrado); }
      .fila-personal td { opacity: 0.45; }
      .estado {
        font-family: var(--f-cifras); font-size: 11px;
        letter-spacing: 0.1em; padding: 3px 8px;
        border-radius: 3px; border: 1px solid var(--linea);
      }
      .estado.matched { border-color: var(--cuadrado); color: var(--cuadrado); }
      .estado.pending { border-color: var(--pendiente); color: var(--pendiente); }
      .estado.personal { color: var(--papel-tenue); }
      .estado.resolved { border-color: var(--laton); color: var(--laton); }
      .celda-acciones { display: flex; gap: 6px; flex-wrap: wrap; }
      .celda-acciones button { padding: 4px 9px; min-height: 30px; font-size: 12px; }
      .nota-registro { margin-top: 14px; }
      /* Guardián de duplicados */
      .guardian {
        margin-top: 10px; padding: 12px;
        border: 1px solid var(--pendiente); border-radius: var(--radio);
        background: var(--superficie-2);
      }
      .guardian-titulo {
        font-size: 12px; color: var(--pendiente);
        font-weight: 600; margin-bottom: 8px;
      }
      .guardian-candidato {
        font-size: 12px; color: var(--papel);
        font-family: var(--f-cifras); margin-bottom: 4px;
      }
      .guardian-acciones { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
      .guardian-acciones button { padding: 5px 10px; min-height: 30px; font-size: 12px; }
      @media (max-width: 800px) {
        .resumen-strip { flex-direction: column; }
        .desc { max-width: none; }
      }
    `,
  ],
})
export class ConciliacionComponent {
  private api = inject(KontiaApi);

  archivo = signal<File | null>(null);
  importando = signal(false);
  error = signal<string | null>(null);
  sesiones = signal<any[]>([]);
  sesionActual = signal<any | null>(null);
  items = signal<any[]>([]);
  // Guardián de duplicados
  verificando = signal<string | null>(null);
  advertenciaId = signal<string | null>(null);
  candidatos = signal<any[]>([]);

  constructor() {
    this.cargarSesiones();
  }

  archivoSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement;
    this.archivo.set(input.files?.[0] ?? null);
    this.error.set(null);
  }

  async cargarSesiones() {
    try {
      this.sesiones.set(await this.api.reconSessions());
    } catch {
      /* backend caído */
    }
  }

  async importar() {
    const file = this.archivo();
    if (!file || this.importando()) return;
    this.importando.set(true);
    this.error.set(null);
    try {
      const r = await this.api.reconImport(file);
      this.sesionActual.set(r.session);
      this.items.set(r.items);
      await this.cargarSesiones();
    } catch (e: any) {
      this.error.set(e?.error?.detail ?? 'No se pudo importar el estado.');
    } finally {
      this.importando.set(false);
    }
  }

  async abrirSesion(id: string) {
    try {
      const r = await this.api.reconSession(id);
      this.sesionActual.set(r.session);
      this.items.set(r.items);
    } catch (e: any) {
      this.error.set(e?.error?.detail ?? 'No se pudo abrir la sesión.');
    }
  }

  cerrarSesion() {
    this.sesionActual.set(null);
    this.items.set([]);
    this.cerrarGuardian();
  }

  async marcar(item: any, status: string) {
    try {
      const actualizado = await this.api.reconSetStatus(item.id, status);
      this.items.update((lista) =>
        lista.map((i) => (i.id === item.id ? actualizado : i))
      );
    } catch (e: any) {
      this.error.set(e?.error?.detail ?? 'No se pudo actualizar.');
    }
  }

  // ------------------------------------------------------------------
  // Guardián de duplicados: verificar ANTES de registrar
  // ------------------------------------------------------------------
  async registrarConGuardian(item: any) {
    this.verificando.set(item.id);
    this.cerrarGuardian();
    try {
      const hits = await this.api.reconNearMatches(item.amount, item.txn_date);
      if (hits.length > 0) {
        this.advertenciaId.set(item.id);
        this.candidatos.set(hits);
      } else {
        this.irAlAgente(item);
      }
    } catch {
      // Si la verificación falla, mejor advertir que dejar pasar:
      this.error.set('No se pudo verificar duplicados — revisa Asientos antes de registrar.');
    } finally {
      this.verificando.set(null);
    }
  }

  async marcarDesdeGuardian(item: any, status: string) {
    this.cerrarGuardian();
    await this.marcar(item, status);
  }

  registrarDeTodasFormas(item: any) {
    this.cerrarGuardian();
    this.irAlAgente(item);
  }

  cerrarGuardian() {
    this.advertenciaId.set(null);
    this.candidatos.set([]);
  }

  private irAlAgente(item: any) {
    const monto = Math.abs(item.amount).toFixed(2);
    const verbo = item.amount < 0 ? 'Pagué' : 'Recibí';
    const texto = `${verbo} ${monto} — ${item.description.slice(0, 120)} — el ${item.txn_date}`;
    sessionStorage.setItem('agente_prefill', texto);
    window.location.href = '/agente';
  }

  contar(status: string): number {
    return this.items().filter((i) => i.status === status).length;
  }

  fmtNum(v: number): string {
    return (typeof v === 'number' && !isNaN(v) ? v : 0).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }
}