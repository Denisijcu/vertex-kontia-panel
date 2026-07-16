# Kontia

**Contabilidad agent-native de partida doble.** El libro mayor de 1494 + el agente de 2026.

Un ledger inmutable con integridad forzada por la base de datos, donde Claude clasifica transacciones en lenguaje natural pero **jamás escribe al ledger**: propone, un motor determinista valida y postea. Dogfooding real: lleva la contabilidad verdadera de Vertex Coders LLC en producción.

---

## Arquitectura — la frontera sagrada

```
┌─────────────────────────────────────────────────────────┐
│ CAPA AGÉNTICA (app/agent/)                              │
│ Claude clasifica, propone, consulta. JAMÁS escribe.     │
├─────────────────────────────────────────────────────────┤
│ CAPA DETERMINISTA (app/services/)                       │
│ posting_engine = ÚNICO camino de escritura al ledger.   │
│ Los subledgers (AR/AP, activos) postean a través de él. │
├─────────────────────────────────────────────────────────┤
│ CAPA DE DATOS (PostgreSQL + triggers)                   │
│ Última línea de defensa. La integridad vive aquí.       │
└─────────────────────────────────────────────────────────┘
```

**Invariantes forzados por la base de datos (no por la aplicación):**

- Partida doble: `SUM(debit) = SUM(credit)` por asiento (constraint trigger deferido).
- Asientos posteados **inmutables**: solo se deshacen por storno (`POST /entries/{id}/reverse`). Única transición permitida: `posted → reversed`.
- Imposible postear en período cerrado o bloqueado.
- `audit_log` append-only con hash chain SHA-256, verificable en `GET /audit-log/verify`.
- Multi-tenant con `FORCE ROW LEVEL SECURITY`; la app setea `app.tenant_id` por transacción.
- Montos: `NUMERIC(19,4)` / `Decimal` en Python. **Jamás float.**

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Python 3.14 · FastAPI · SQLAlchemy 2.0 async (asyncpg) · Alembic |
| Base de datos | PostgreSQL 16 (`pgcrypto`, `ltree`, `uuid-ossp`) |
| Agente | Claude vía API (httpx), prompts versionados en `app/agent/prompts/` |
| Auth | JWT (python-jose) + bcrypt **4.0.1 pineado** |
| Frontend | Angular 19 standalone · signals · zoneless · `inject()` |
| Deploy | Railway (backend + Postgres) · Netlify (panel) |

## Estructura del backend

```
app/
├── main.py · config.py · database.py
├── models/    ledger.py · agent.py · user.py · invoice.py · fixed_asset.py
├── schemas/   ledger.py · reports.py
├── services/  posting_engine.py   ← único camino de escritura
│              reporting_service.py · invoice_service.py
│              fixed_asset_service.py · closing_service.py
│              nl_query_service.py · auth_service.py · coa_service.py
├── agent/     client.py · classifier.py · nl_query.py
│              prompts/classifier.md · prompts/nl_query.md  (VERSIONADOS)
├── api/       auth · accounts · entries · periods · reports · agent
│              audit · nl_query · invoices · fixed_assets · closing
├── templates_coa/vertex_llc_us.json
└── scripts/   seed_vertex.py · create_user.py  (idempotentes)
```

## Endpoints (`/api/v1`, Bearer JWT salvo login)

| Módulo | Endpoints |
|---|---|
| Auth | `POST /auth/login` · `GET /auth/me` |
| Ledger | `GET\|POST /entries` · `POST /entries/{id}/reverse` · `GET /accounts` |
| Períodos | `GET /periods` · `POST /periods/{name}/close\|reopen\|lock` |
| Reportes | `GET /reports/trial-balance \| balance-sheet \| income-statement \| expenses-by-activity` |
| Agente | `POST /agent/classify` · `GET /agent/proposals` · `POST /agent/proposals/{id}/approve\|reject` |
| Consulta NL | `POST /nl-query` |
| AR/AP | `POST\|GET /invoices` · `POST /invoices/{id}/payments` · `POST /invoices/{id}/void` · `GET /invoices/aging` |
| Activos | `POST\|GET /fixed-assets` · `POST /fixed-assets/run-depreciation` |
| Cierre | `POST /closing/close-year` |
| Auditoría | `GET /audit-log` · `GET /audit-log/verify` |

## Desarrollo local

```bash
# Backend
cd backend
docker compose up -d          # Postgres en :15432 (¡no 5432!) + Redis :6379
python -m venv venv && venv/Scripts/activate
pip install -r requirements.txt
alembic upgrade head
python -m app.scripts.seed_vertex     # tenant + COA + períodos
python -m app.scripts.create_user
uvicorn app.main:app --reload --port 8000

# Panel
cd panel
npm install
ng serve                      # http://localhost:4200
```

**Verificación obligatoria antes de cada push:**
```bash
python -c "from app.main import app; print('OK')"
```

## Deploy

- **Backend:** push a `main` → Railway construye el Docker y corre `alembic upgrade head` automático en el CMD (`sh -c` para expandir `${PORT}`).
- **Panel:** `ng build` → subir `dist/panel/browser/` a Netlify (`_redirects`: `/* /index.html 200`).
- **Scripts contra producción desde local:** usar la connection string **pública** de Railway (`proxy.rlwy.net`); la interna solo funciona dentro de Railway. Desde la shell del contenedor: `cd /app && python -m app.scripts.seed_vertex`.

## Gotchas conocidos

- Postgres local en el puerto **15432**.
- `get_settings()` usa `@lru_cache`: editar `.env` exige reiniciar uvicorn.
- `bcrypt==4.0.1` pineado siempre (incompatibilidad con passlib).
- El CHECK de `journal_entries.source_module` define los módulos válidos: `manual, ar, ap, inventory, fixed_assets, payroll, agent, system`. Un módulo nuevo exige migración.
- Los prompts del agente están versionados: **nunca editar sin subir la versión.**

## Principio rector

> El posting_engine es el único camino al ledger. Cualquier código que lo salte es un bug por definición. Si un número no cuadra, el problema está en el posting — jamás se "ajusta" en el reporte.


Version 3

# KONTIA_BRIEFING.md — Estado del proyecto
_Actualizado: 2026-07-12 · Fase 3 COMPLETA_

## Arquitectura (invariante)
FastAPI + SQLAlchemy 2.0 async + Alembic + PostgreSQL (Railway) · Angular 19 standalone signals (Netlify) · Tres capas: agéntica (Claude propone) → determinista (PostingEngine valida/ejecuta) → BD (triggers de inmutabilidad, hash chain, RLS forzado). Dogfooding real: los libros de Vertex Coders LLC corren dentro.

Constantes de control: bancos 1100 · AR 1200 · AP 2100 · resultados acumulados 3300 · activos fijos 1400/1450/5750 · bcrypt 4.0.1 (jamás passlib) · JWT con tenant_id como claim firmado.

## ✅ FASE 1 — COMPLETADA
Core del ledger (inmutable, partida doble, hash chain, períodos, RLS forzado) · Classifier v1.1.0 con cost centers y cola de revisión · Reportes (trial balance, balance, resultados, gastos por actividad) · Auth JWT · Panel completo · Deploy Railway + Netlify.

## ✅ FASE 1.5 — COMPLETADA
Breakdown de gastos por proyecto en Dashboard · nl_query · pulido de refresh/móvil.

## ✅ FASE 2 — COMPLETADA
AR/AP con void y aging · Activos Fijos v1 (depreciación lineal) · Cierre de Ejercicio (→ 3300) · Conciliación Bancaria con guardián de duplicados · README + Guía de Operación v2.

## ✅ FASE 3 — COMPLETADA (cerrada hoy)
- **Bloque 1:** onboarding multi-tenant (registro todo-o-nada) · template `niif_pyme` (45 cuentas, códigos de control conservados) · gestión de usuarios (invitar/listar/desactivar) · roles viewer/accountant/owner en `deps.py`.
- **Bloque 2 (hoy):** **migración asistida desde QuickBooks/Excel** — validada end-to-end en producción contra PyME Demo SAS. Flujo: `POST /migration/import` (CSV/xlsx, máx 300 filas / 2 MB) → agente mapea (prompt `migration_mapper.md` v1.0.0, umbral confianza 0.75) → validación determinista degrada filas inválidas a `needs_review` → cola approve/reject por mapeo → `commit` (solo owner) genera UN asiento de apertura vía PostingEngine con `source_module="migration"`.
- Archivos nuevos: `app/models/migration.py` · `app/schemas/migration.py` · `app/services/migration_service.py` · `app/api/migration.py` · `app/agent/prompts/migration_mapper.md` · migraciones `0008_migration_tables` (RLS incluido) y `0009_source_module_migration`.

## 🔐 Bug de seguridad cazado y corregido HOY
**Escalada de privilegios:** 14 endpoints de escritura en 7 routers usaban `get_tenant_db` (lectura) en vez de `_writer`/`_owner` — un viewer podía postear asientos reales (reproducido: entry #19 de Vertex, revertido con storno #20). Corregido y verificado en producción:
- `_writer`: agent classify/approve/reject · fixed_assets create/run-depreciation · invoices create/payments · reconciliation import/item-status · entries create · migration import/approve/reject/discard
- `_owner`: entries reverse · invoices void · periods close/reopen/lock · closing close-year · migration commit

## Guardianes probados EN VIVO hoy
Descuadre de apertura (rebotó $50 con monto exacto, exige `adjustment_account_code`) · anti-doble-commit de sesión · aviso de tenant con asientos previos (saltó cuando un import cayó en Vertex por token equivocado) · rollback transaccional total (CheckViolation no dejó ni media fila) · IntegrityError → 422 legible (nunca más 500 mudo en commit).

## Lecciones/hábitos acumulados
- `kcheck` (`python -c "from app.main import app"`) **con venv activo** antes de cada push.
- Mojibake que solo aparece en pipes de Git Bash = el terminal, NO los datos (dos veces nos intentó engañar). Verificar con archivo + `encoding='utf-8'`, nunca por pipe.
- El CHECK de `source_module` en `journal_entries` tiene lista cerrada — todo módulo nuevo que postee necesita su valor en el constraint (por eso nació la 0009).
- `alembic heads` se corre ANTES de copiar una migración nueva con placeholder.
- Roles correctos (`get_tenant_db`/`_writer`/`_owner`) en cada endpoint NUEVO desde el día uno.
- Los tokens llevan el tenant firmado adentro: `$TOKEN` = Vertex, `$TOKEN_DEMO` = demo. Confundirlos crea datos en el tenant equivocado.

## Datos de la demo (sandbox permanente)
PyME Demo SAS · tenant `6ec7d2e9-ea5d-4685-87d2-af93e9bc6508` · owner `demo@pymedemo.com` / `DemoPass2026` · estado actual: apertura migrada limpia (asiento #2, 7 líneas, ajuste $50 en 3300) + test bisect #1 stornado por #3 · `equation_holds: true`.

## ⬜ LO QUE VIENE — FASE 4: Agent-native al máximo (el diferenciador)
12. **Servidor MCP**: exponer Kontia como tools para agentes externos — nadie en el mercado está ahí. ← PRÓXIMO CAPÍTULO
13. Pre-auditoría nightly: checklist de compliance corriendo solo, hallazgos al dashboard.
14. Detección de anomalías: duplicados, montos atípicos, gaps de folios.
15. Reportes exportables PDF auditables (XBRL muerto salvo que un cliente lo pida).

## ⬜ FASE 5 — Producto y mercado
16. App Android (Kotlin + Jetpack Compose): foto de factura → Claude Vision → approval móvil.
17. Landing + naming (kontia.ai), pricing, modelo WebView/Play Store.
18. Hardening comercial: rate limiting, backups verificados, monitoreo.

## Pendientes menores (no bloquean)
`list_templates` tolerante a JSON rotos · encoding real del `niif_pyme.json` (regenerar archivo — cosmético) · pantalla de onboarding en el panel · pantalla de migración en el panel (el módulo hoy es API-only) · v1.1s: worker ARQ, disposal de activos, matching semántico · TODO `actor="api"` → usuario real del JWT en todos los routers · rate limiting en `/onboarding/register` (anotado para Fase 5).

---
_Chat nuevo: "seguimos con Kontia, Fase 4: servidor MCP" y arrancamos sin preámbulo._
