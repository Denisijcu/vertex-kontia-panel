import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environment/environment';

/* ------------------------------------------------------------------ */
/* Tipos (espejo de los schemas Pydantic; Decimal llega como string)  */
/* ------------------------------------------------------------------ */
export interface AccountBalance {
  code: string;
  name: string;
  account_type: string;
  total_debit: string;
  total_credit: string;
  balance: string;
}

export interface BalanceSheet {
  as_of: string;
  assets: AccountBalance[];
  liabilities: AccountBalance[];
  equity: AccountBalance[];
  net_income_to_date: string;
  total_assets: string;
  total_liabilities: string;
  total_equity: string;
  equation_holds: boolean;
}

export interface IncomeStatement {
  date_from: string;
  date_to: string;
  income: AccountBalance[];
  expenses: AccountBalance[];
  total_income: string;
  total_expenses: string;
  net_income: string;
}

/* OJO: este endpoint no tiene response_model → FastAPI serializa los
   Decimal como NÚMEROS (no strings como el resto de reportes). */
export interface ActivityExpense {
  activity: string;
  total: number;
}

export interface ExpensesByActivity {
  date_from: string | null;
  date_to: string | null;
  activities: ActivityExpense[];
  grand_total: number;
}

export interface AccountNode {
  id: string;
  code: string;
  name: string;
  account_type: string;
  normal_side: string;
  path: string;
  depth: number;
  is_postable: boolean;
  is_active: boolean;
}

export interface EntryLine {
  line_no: number;
  account_code: string;
  account_name: string;
  debit: string;
  credit: string;
  memo: string | null;
}

export interface Entry {
  id: string;
  entry_no: number;
  entry_date: string;
  status: string;
  description: string;
  source_module: string;
  entry_hash: string | null;
  posted_at: string | null;
  lines: EntryLine[];
}

export interface Proposal {
  id: string;
  raw_input: string;
  proposal: {
    classifiable: boolean;
    entry_date: string | null;
    description: string;
    lines: { account_code: string; debit: string; credit: string; memo: string | null }[];
    confidence: number;
    reasoning: string;
  };
  confidence: string;
  reasoning: string;
  model: string;
  status: string;
  entry_id: string | null;
  created_at: string;
}

export interface ClassifyResponse {
  proposal: Proposal;
  posted_entry: Entry | null;
  threshold: number;
}

export interface ChainVerification {
  total_events: number;
  valid: boolean;
  first_broken_id: number | null;
  detail: string;
}


export interface NLQueryResponse {
  question: string;
  query_id: string | null;
  confidence: number;
  prompt_version?: string;
  answerable: boolean;
  message?: string;
  reasoning?: string;
  params?: Record<string, unknown>;
  data: any | null;
}


/* AR/AP: InvoiceOut con response_model → Decimals como STRING */
export interface InvoiceOut {
  id: string;
  direction: string;
  counterparty: string;
  invoice_number: string | null;
  issue_date: string;
  due_date: string;
  amount: string;
  account_code: string;
  cost_center: string | null;
  description: string;
  status: string;
  entry_id: string;
  outstanding: string;
}

/* aging sin response_model → números */
export interface AgingReport {
  direction: string;
  as_of: string;
  buckets: Record<string, any[]>;
  totals: Record<string, number>;
  grand_total: number;
}

/* Activos fijos: con response_model → Decimals como STRING */
export interface FixedAssetOut {
  id: string;
  name: string;
  acquisition_date: string;
  cost: string;
  salvage_value: string;
  useful_life_months: number;
  asset_account_code: string;
  accum_account_code: string;
  expense_account_code: string;
  cost_center: string | null;
  status: string;
  entry_id: string;
  accumulated_depreciation: string;
  book_value: string;
}

/* ------------------------------------------------------------------ */
@Injectable({ providedIn: 'root' })
export class KontiaApi {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  entries(limit = 50, beforeNo?: number): Promise<Entry[]> {
    let params = new HttpParams().set('limit', limit);
    if (beforeNo != null) params = params.set('before_no', beforeNo);
    return firstValueFrom(
      this.http.get<Entry[]>(`${this.base}/entries`, { params })
    );
  }

  accounts(): Promise<AccountNode[]> {
    return firstValueFrom(
      this.http.get<AccountNode[]>(`${this.base}/accounts`)
    );
  }

  balanceSheet(asOf?: string): Promise<BalanceSheet> {
    let params = new HttpParams();
    if (asOf) params = params.set('as_of', asOf);
    return firstValueFrom(
      this.http.get<BalanceSheet>(`${this.base}/reports/balance-sheet`, { params })
    );
  }

  incomeStatement(from: string, to: string): Promise<IncomeStatement> {
    const params = new HttpParams().set('date_from', from).set('date_to', to);
    return firstValueFrom(
      this.http.get<IncomeStatement>(`${this.base}/reports/income-statement`, { params })
    );
  }

  expensesByActivity(from?: string, to?: string): Promise<ExpensesByActivity> {
    let params = new HttpParams();
    if (from) params = params.set('date_from', from);
    if (to) params = params.set('date_to', to);
    return firstValueFrom(
      this.http.get<ExpensesByActivity>(`${this.base}/reports/expenses-by-activity`, { params })
    );
  }

  classify(text: string, autoPost = true): Promise<ClassifyResponse> {
    return firstValueFrom(
      this.http.post<ClassifyResponse>(`${this.base}/agent/classify`, {
        text,
        auto_post: autoPost,
      })
    );
  }

  proposals(status = 'pending'): Promise<Proposal[]> {
    const params = new HttpParams().set('status', status);
    return firstValueFrom(
      this.http.get<Proposal[]>(`${this.base}/agent/proposals`, { params })
    );
  }

  approveProposal(id: string): Promise<ClassifyResponse> {
    return firstValueFrom(
      this.http.post<ClassifyResponse>(`${this.base}/agent/proposals/${id}/approve`, {})
    );
  }

  rejectProposal(id: string, reason: string): Promise<Proposal> {
    return firstValueFrom(
      this.http.post<Proposal>(`${this.base}/agent/proposals/${id}/reject`, { reason })
    );
  }

  verifyChain(): Promise<ChainVerification> {
    return firstValueFrom(
      this.http.get<ChainVerification>(`${this.base}/audit-log/verify`)
    );
  }

  nlQuery(question: string): Promise<NLQueryResponse> {
    return firstValueFrom(
      this.http.post<NLQueryResponse>(`${this.base}/nl-query`, { question })
    );
  }

  createInvoice(payload: any): Promise<InvoiceOut> {
    return firstValueFrom(
      this.http.post<InvoiceOut>(`${this.base}/invoices`, payload)
    );
  }

  invoices(direction?: string, status?: string): Promise<InvoiceOut[]> {
    let params = new HttpParams();
    if (direction) params = params.set('direction', direction);
    if (status) params = params.set('status', status);
    return firstValueFrom(
      this.http.get<InvoiceOut[]>(`${this.base}/invoices`, { params })
    );
  }

  registerPayment(id: string, payload: { amount: string; payment_date: string }): Promise<any> {
    return firstValueFrom(
      this.http.post(`${this.base}/invoices/${id}/payments`, payload)
    );
  }

  voidInvoice(id: string, reason: string): Promise<InvoiceOut> {
    return firstValueFrom(
      this.http.post<InvoiceOut>(`${this.base}/invoices/${id}/void`, { reason })
    );
  }

  invoiceAging(direction: string): Promise<AgingReport> {
    const params = new HttpParams().set('direction', direction);
    return firstValueFrom(
      this.http.get<AgingReport>(`${this.base}/invoices/aging`, { params })
    );
  }

  createFixedAsset(payload: any): Promise<FixedAssetOut> {
    return firstValueFrom(
      this.http.post<FixedAssetOut>(`${this.base}/fixed-assets`, payload)
    );
  }

  fixedAssets(): Promise<FixedAssetOut[]> {
    return firstValueFrom(
      this.http.get<FixedAssetOut[]>(`${this.base}/fixed-assets`)
    );
  }

  runDepreciation(period: string): Promise<any> {
    return firstValueFrom(
      this.http.post(`${this.base}/fixed-assets/run-depreciation`, { period })
    );
  }
}