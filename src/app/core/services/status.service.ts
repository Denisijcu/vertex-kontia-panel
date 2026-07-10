import { Injectable, computed, inject, signal } from '@angular/core';
import {
  BalanceSheet,
  ChainVerification,
  KontiaApi,
} from './kontia-api.service';

/**
 * Estado vivo del chrome (header + footer).
 *
 * La Ecuación Viva y la cadena de auditoría se cargan una vez al arrancar
 * y se re-verifican con refresh() — las pantallas lo invocan después de
 * cada posting, así el chrome siempre refleja el ledger real.
 */
@Injectable({ providedIn: 'root' })
export class StatusService {
  private api = inject(KontiaApi);

  readonly balance = signal<BalanceSheet | null>(null);
  readonly chain = signal<ChainVerification | null>(null);
  readonly verificando = signal(false);

  /** true = ecuación cuadrada Y cadena íntegra. El semáforo maestro. */
  readonly integro = computed(() => {
    const b = this.balance();
    const c = this.chain();
    if (!b || !c) return null;
    return b.equation_holds && c.valid;
  });

  constructor() {
    this.refresh();
  }

  async refresh(): Promise<void> {
    this.verificando.set(true);
    const hoy = new Date().toISOString().slice(0, 10);
    try {
      const [b, c] = await Promise.all([
        this.api.balanceSheet(hoy),
        this.api.verifyChain(),
      ]);
      this.balance.set(b);
      this.chain.set(c);
    } catch {
      /* backend caído: el chrome muestra estado desconocido, no revienta */
    } finally {
      this.verificando.set(false);
    }
  }
}