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
