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

/* Hallazgos de pre-auditoria (Fase 4, puntos 13/14) — con response_model
   FindingOut → Decimals/UUIDs como STRING, detail es JSONB libre. */
export interface AuditFinding {
  id: string;
  run_id: string;
  check_id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: Record<string, unknown>;
  resolved: boolean;
  created_at: string;
}

/* Panel de administracion de plataforma (super-admin, cross-tenant) */
export interface AdminTenantOverview {
  tenant_id: string;
  name: string;
  base_currency: string;
  user_count: number;
  entry_count: number;
  last_activity: string | null;
  open_findings: number;
  open_critical_findings: number;
}

export interface AdminTenantUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_platform_admin: boolean;
}

export interface AdminOpenFinding {
  id: string;
  check_id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  created_at: string;
}

export interface AdminTenantDetail {
  tenant_id: string;
  name: string;
  base_currency: string;
  created_at: string;
  equation_holds: boolean;
  total_assets: string;
  users: AdminTenantUser[];
  open_findings: AdminOpenFinding[];
}

/* Usuarios y roles del tenant propio (app/api/users.py, solo owner) */
export interface TenantUser {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'accountant' | 'viewer';
  is_active: boolean;
}

export interface TenantUserCreate {
  email: string;
  password: string;
  full_name: string;
  role: 'owner' | 'accountant' | 'viewer';
}

/* API Keys (Fase 4, MCP) — la key en claro solo viene en la creación */
export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  role: 'owner' | 'accountant' | 'viewer';
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface ApiKeyCreated extends ApiKey {
  plain_key: string;
}

/* Periodos fiscales y cierre de ejercicio */
export interface FiscalPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed' | 'locked';
  closed_at: string | null;
}

/* close-year: sin response_model en el backend, Decimals como numeros */
export interface CloseYearResult {
  year: number;
  entry_no: number;
  entry_id: string;
  net_income: number;
  lines_closed: number;
}

/* Migracion asistida (Fase 3 Bloque 2) — con response_model, Decimals
   como STRING (mismo patron que InvoiceOut/FixedAssetOut). El status
   de MigrationMapping SI esta confirmado (proposed/needs_review/
   approved/rejected, visto en el filtro del router); el status de
   MigrationSession NO tiene enum conocido -- se muestra tal cual. */
export interface MigrationMapping {
  id: string;
  row_no: number;
  source_code: string | null;
  source_name: string;
  balance: string;
  side: 'debit' | 'credit';
  proposed_code: string | null;
  proposed_name: string | null;
  confidence: string;
  reasoning: string;
  status: 'proposed' | 'needs_review' | 'approved' | 'rejected';
  final_code: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface MigrationSessionSummary {
  id: string;
  filename: string;
  status: string;
  created_at: string;
  row_count: number;
  pending_count: number;
  committed_entry_id: string | null;
}

export interface MigrationSessionDetail extends MigrationSessionSummary {
  approved_debit: string;
  approved_credit: string;
  imbalance: string;
  mappings: MigrationMapping[];
}

export interface MigrationImportResponse {
  session_id: string;
  filename: string;
  status: string;
  row_count: number;
  needs_review_count: number;
  warning: string | null;
}

export interface MigrationCommitResponse {
  session_id: string;
  entry_id: string;
  entry_no: number;
  total_debit: string;
  total_credit: string;
  adjustment_amount: string;
  lines_posted: number;
}

/* Onboarding — templates COA y creacion de tenant */
export interface OnboardingTemplate {
  template_id: string;
  name: string;
  currency: string;
  description: string;
  accounts_count: number;
}

export interface RegisterTenantResult {
  tenant_id: string;
  company: string;
  template: string;
  accounts_created: number;
  fiscal_year: number;
  owner_email: string;
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

  /* Conciliación bancaria — sin response_model → números */
  reconImport(file: File): Promise<any> {
    const form = new FormData();
    form.append('file', file);
    // OJO: no seteamos Content-Type — el navegador arma el multipart solo
    return firstValueFrom(
      this.http.post(`${this.base}/reconciliation/import`, form)
    );
  }

  reconSessions(): Promise<any[]> {
    return firstValueFrom(
      this.http.get<any[]>(`${this.base}/reconciliation/sessions`)
    );
  }

  reconSession(id: string): Promise<any> {
    return firstValueFrom(
      this.http.get(`${this.base}/reconciliation/sessions/${id}`)
    );
  }

  reconSetStatus(id: string, status: string): Promise<any> {
    return firstValueFrom(
      this.http.post(`${this.base}/reconciliation/items/${id}/status`, { status })
    );
  }

  reconNearMatches(amount: number, txnDate: string): Promise<any[]> {
    const params = new HttpParams()
      .set('amount', Math.abs(amount))
      .set('txn_date', txnDate);
    return firstValueFrom(
      this.http.get<any[]>(`${this.base}/reconciliation/near-matches`, { params })
    );
  }

  /* ================================================================ */
  /* Fase 4 punto 15 — Reportes PDF auditables                        */
  /* ================================================================ */
  /* Descarga un blob y dispara el "Save As" del navegador. El backend
     ya viene con Content-Disposition: inline, pero forzamos la
     descarga aca porque un PDF de contabilidad se guarda, no se ve
     de pasada en una pestaña nueva. */
  private descargarBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async balanceSheetPdf(asOf?: string): Promise<void> {
    let params = new HttpParams();
    if (asOf) params = params.set('as_of', asOf);
    const blob = await firstValueFrom(
      this.http.get(`${this.base}/reports-pdf/balance-sheet`, {
        params,
        responseType: 'blob',
      })
    );
    this.descargarBlob(blob, `balance_general_${asOf ?? 'hoy'}.pdf`);
  }

  async trialBalancePdf(dateFrom?: string, dateTo?: string): Promise<void> {
    let params = new HttpParams();
    if (dateFrom) params = params.set('date_from', dateFrom);
    if (dateTo) params = params.set('date_to', dateTo);
    const blob = await firstValueFrom(
      this.http.get(`${this.base}/reports-pdf/trial-balance`, {
        params,
        responseType: 'blob',
      })
    );
    this.descargarBlob(blob, 'balanza_comprobacion.pdf');
  }

  async journalEntriesPdf(dateFrom?: string, dateTo?: string): Promise<void> {
    let params = new HttpParams();
    if (dateFrom) params = params.set('date_from', dateFrom);
    if (dateTo) params = params.set('date_to', dateTo);
    const blob = await firstValueFrom(
      this.http.get(`${this.base}/reports-pdf/journal-entries`, {
        params,
        responseType: 'blob',
      })
    );
    this.descargarBlob(blob, 'libro_diario.pdf');
  }

  async auditFindingsPdf(includeResolved = false): Promise<void> {
    const params = new HttpParams().set('include_resolved', includeResolved);
    const blob = await firstValueFrom(
      this.http.get(`${this.base}/reports-pdf/audit-findings`, {
        params,
        responseType: 'blob',
      })
    );
    this.descargarBlob(blob, 'hallazgos_auditoria.pdf');
  }

  /* ================================================================ */
  /* Fase 4 puntos 13/14 — Hallazgos de pre-auditoria (JSON, pantalla) */
  /* ================================================================ */
  auditFindings(includeResolved = false, severity?: string): Promise<AuditFinding[]> {
    let params = new HttpParams().set('include_resolved', includeResolved);
    if (severity) params = params.set('severity', severity);
    return firstValueFrom(
      this.http.get<AuditFinding[]>(`${this.base}/preaudit/findings`, { params })
    );
  }

  resolveFinding(id: string): Promise<AuditFinding> {
    return firstValueFrom(
      this.http.post<AuditFinding>(`${this.base}/preaudit/findings/${id}/resolve`, {})
    );
  }

  /* ================================================================ */
  /* Panel de administracion de plataforma (super-admin, cross-tenant)*/
  /* ================================================================ */
  adminTenants(): Promise<AdminTenantOverview[]> {
    return firstValueFrom(
      this.http.get<AdminTenantOverview[]>(`${this.base}/admin/tenants`)
    );
  }

  adminTenantDetail(tenantId: string): Promise<AdminTenantDetail> {
    return firstValueFrom(
      this.http.get<AdminTenantDetail>(`${this.base}/admin/tenants/${tenantId}`)
    );
  }

  /* ================================================================ */
  /* Usuarios y roles (tenant propio, solo owner)                     */
  /* ================================================================ */
  tenantUsers(): Promise<TenantUser[]> {
    return firstValueFrom(
      this.http.get<TenantUser[]>(`${this.base}/users`)
    );
  }

  createTenantUser(payload: TenantUserCreate): Promise<TenantUser> {
    return firstValueFrom(
      this.http.post<TenantUser>(`${this.base}/users`, payload)
    );
  }

  updateUserRole(userId: string, role: string): Promise<TenantUser> {
    return firstValueFrom(
      this.http.patch<TenantUser>(`${this.base}/users/${userId}/role`, { role })
    );
  }

  deactivateUser(userId: string): Promise<TenantUser> {
    return firstValueFrom(
      this.http.post<TenantUser>(`${this.base}/users/${userId}/deactivate`, {})
    );
  }

  reactivateUser(userId: string): Promise<TenantUser> {
    return firstValueFrom(
      this.http.post<TenantUser>(`${this.base}/users/${userId}/reactivate`, {})
    );
  }

  /* ================================================================ */
  /* API Keys (Fase 4, MCP) — solo owner                              */
  /* ================================================================ */
  apiKeys(): Promise<ApiKey[]> {
    return firstValueFrom(
      this.http.get<ApiKey[]>(`${this.base}/api-keys`)
    );
  }

  createApiKey(name: string, role: string): Promise<ApiKeyCreated> {
    return firstValueFrom(
      this.http.post<ApiKeyCreated>(`${this.base}/api-keys`, { name, role })
    );
  }

  revokeApiKey(keyId: string): Promise<ApiKey> {
    return firstValueFrom(
      this.http.post<ApiKey>(`${this.base}/api-keys/${keyId}/revoke`, {})
    );
  }

  /* ================================================================ */
  /* Periodos fiscales y cierre de ejercicio                          */
  /* ================================================================ */
  periods(): Promise<FiscalPeriod[]> {
    return firstValueFrom(
      this.http.get<FiscalPeriod[]>(`${this.base}/periods`)
    );
  }

  closePeriod(name: string): Promise<FiscalPeriod> {
    return firstValueFrom(
      this.http.post<FiscalPeriod>(`${this.base}/periods/${name}/close`, {})
    );
  }

  reopenPeriod(name: string, reason: string): Promise<FiscalPeriod> {
    return firstValueFrom(
      this.http.post<FiscalPeriod>(`${this.base}/periods/${name}/reopen`, { reason })
    );
  }

  lockPeriod(name: string): Promise<FiscalPeriod> {
    return firstValueFrom(
      this.http.post<FiscalPeriod>(`${this.base}/periods/${name}/lock`, {})
    );
  }

  /* Shape confirmado desde closing_service.py: year, entry_no, entry_id,
     net_income, lines_closed. Decimals como numeros (sin response_model). */
  closeYear(year: number): Promise<CloseYearResult> {
    return firstValueFrom(
      this.http.post<CloseYearResult>(`${this.base}/closing/close-year`, { year })
    );
  }

  /* ================================================================ */
  /* Migracion asistida (Fase 3 Bloque 2)                              */
  /* ================================================================ */
  migrationImport(file: File): Promise<MigrationImportResponse> {
    const form = new FormData();
    form.append('file', file);
    return firstValueFrom(
      this.http.post<MigrationImportResponse>(`${this.base}/migration/import`, form)
    );
  }

  migrationSessions(): Promise<MigrationSessionSummary[]> {
    return firstValueFrom(
      this.http.get<MigrationSessionSummary[]>(`${this.base}/migration/sessions`)
    );
  }

  migrationSessionDetail(sessionId: string): Promise<MigrationSessionDetail> {
    return firstValueFrom(
      this.http.get<MigrationSessionDetail>(`${this.base}/migration/sessions/${sessionId}`)
    );
  }

  approveMigrationMapping(
    mappingId: string, finalCode: string | null
  ): Promise<MigrationMapping> {
    return firstValueFrom(
      this.http.post<MigrationMapping>(
        `${this.base}/migration/mappings/${mappingId}/approve`,
        { final_code: finalCode || null }
      )
    );
  }

  rejectMigrationMapping(
    mappingId: string, reason: string | null
  ): Promise<MigrationMapping> {
    return firstValueFrom(
      this.http.post<MigrationMapping>(
        `${this.base}/migration/mappings/${mappingId}/reject`,
        { reason: reason || null }
      )
    );
  }

  commitMigrationSession(
    sessionId: string,
    entryDate: string,
    adjustmentAccountCode: string | null,
    description: string
  ): Promise<MigrationCommitResponse> {
    return firstValueFrom(
      this.http.post<MigrationCommitResponse>(
        `${this.base}/migration/sessions/${sessionId}/commit`,
        {
          entry_date: entryDate,
          adjustment_account_code: adjustmentAccountCode || null,
          description,
        }
      )
    );
  }

  discardMigrationSession(sessionId: string): Promise<MigrationSessionSummary> {
    return firstValueFrom(
      this.http.post<MigrationSessionSummary>(
        `${this.base}/migration/sessions/${sessionId}/discard`, {}
      )
    );
  }

  /* ================================================================ */
  /* Onboarding — crear tenant nuevo (usado desde el panel admin)      */
  /* ================================================================ */
  onboardingTemplates(): Promise<OnboardingTemplate[]> {
    return firstValueFrom(
      this.http.get<OnboardingTemplate[]>(`${this.base}/onboarding/templates`)
    );
  }

  registerTenant(payload: {
    company_name: string;
    template_id: string;
    base_currency: string;
    fiscal_year: number | null;
    owner_email: string;
    owner_password: string;
    owner_full_name: string;
  }): Promise<RegisterTenantResult> {
    return firstValueFrom(
      this.http.post<RegisterTenantResult>(`${this.base}/onboarding/register`, payload)
    );
  }
}