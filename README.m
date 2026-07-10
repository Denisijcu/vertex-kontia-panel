# Kontia — Panel

**Frontend Angular 19** de la plataforma contable agent-native de
Vertex Coders LLC.

> Producción: https://vertex-kontia.netlify.app

---

## Identidad de diseño

Concepto: **"El libro mayor de 1494 con un agente de 2026"** —
instrumento de precisión financiera, no página web.

| Elemento | Decisión |
|---|---|
| Paleta | Verde tinta profundo (`#0e1512`) + latón de banquero (`#c8a24b`) + tono papel (`#e8e4d8`) |
| Tipografía | Libre Caslon Text (el 1494) · IBM Plex Sans (el 2026) · IBM Plex Mono tabular (las cifras) |
| Firma | **El Sello de Cuadre**: la ecuación A = P + PN en vivo, con estampa `CUADRADO`/`ROTO` |
| Chrome | Header con Ecuación Viva + semáforo de integridad · Footer terminal con cadena de auditoría y reloj UTC |

Tokens en `src/styles.css` (variables CSS). Toda cifra usa la clase
`.cifra` (mono, tabular-nums, alineada a la derecha).

## Stack

- Angular 19 **standalone** (sin NgModules)
- **Signals** para todo el estado · `inject()` (nunca constructor
  injection — esbuild no soporta `emitDecoratorMetadata`)
- **Zoneless** change detection (`provideExperimentalZonelessChangeDetection`)
- Rutas **lazy-loaded** con `authGuard`
- Auth: JWT Bearer vía `authInterceptor` (401 → logout automático)

## Pantallas

| Ruta | Pantalla |
|---|---|
| `/login` | La portada del libro — "Abrir el libro mayor" |
| `/dashboard` | Sello de Cuadre + balance general + estado de resultados |
| `/agente` | Captura en lenguaje natural + resultado con confianza + cola de revisión |
| `/asientos` | Libro diario: folios, origen, sellos hash, líneas expandibles |
| `/cuentas` | Árbol del plan de cuentas (indentado por ltree) |
| `/404` | Folio sin registrar (estampa `SIN REGISTRO`) |

## Setup

```bash
npm install

# src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api/v1',   // backend local
};

ng serve   # → http://localhost:4200
```

Requiere el backend corriendo (ver README del backend). El login usa
credenciales creadas con `create_user.py` — no hay registro público.

## Build y deploy (Netlify)

```bash
# 1. Apuntar al backend de producción en environment.ts:
#    apiUrl: 'https://<app>.up.railway.app/api/v1'

# 2. SPA redirects — public/_redirects:
#    /*  /index.html  200

# 3. Build
ng build

# 4. Subir dist/panel/browser/ a Netlify (drag & drop o CLI)

# 5. En Railway: CORS_ORIGINS=https://<sitio>.netlify.app
```

## Estructura

```
src/app/
├── app.component.ts        # shell: header + sidebar + footer
├── app.config.ts           # zoneless, router, authInterceptor
├── app.routes.ts           # lazy + guards
├── core/
│   ├── kontia-api.service.ts   # cliente tipado del API
│   ├── auth.service.ts         # sesión (signals + localStorage)
│   ├── auth.interceptor.ts     # Bearer + auto-logout en 401
│   ├── auth.guard.ts
│   └── status.service.ts       # Ecuación Viva + cadena (refresh())
├── shared/
│   ├── header.component.ts     # barra de instrumento
│   └── footer.component.ts     # línea de registro (reloj UTC)
└── features/
    ├── login/ · dashboard/ · agente/ · asientos/ · cuentas/ · not-found/
```

## Convenciones

- Los montos llegan del API como **string** (Decimal de Pydantic):
  convertir con `parseFloat`/`+` solo para presentación — el frontend
  jamás hace aritmética contable.
- Tras cada posting, llamar `StatusService.refresh()` para que el
  chrome (ecuación + cadena) respire con el ledger.
- Componentes nuevos: standalone, signals, template/styles inline,
  copy de UI en español siguiendo el lenguaje del ledger.

---

© 2026 Vertex Coders LLC