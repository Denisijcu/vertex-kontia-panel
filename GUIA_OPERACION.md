# Guía de Operación — Cómo usar Kontia

Manual del operador. Cómo llevar la contabilidad día a día, qué hacer
cuando algo sale mal, y las reglas que nunca se rompen.

---

## 1. El día a día: registrar transacciones

Todo empieza en la pantalla **Agente**. Describe la transacción como se
la contarías a tu contador:

> "Pagué 5 de Railway con la tarjeta, para Seismic"

**Anatomía de una buena descripción:**
- **Qué y cuánto:** "pagué 47.32 de Railway"
- **Con qué:** "con la tarjeta" (→ 2200) / "del banco" o "pagué" a secas (→ 1100)
- **Para qué proyecto:** "para Kontia / Seismic / DentiaPro…" — sin esto,
  cae en GENERAL. Los gastos genuinamente generales (luz, teléfono,
  oficina) déjalos sin proyecto: GENERAL es su lugar correcto.

**Qué pasa después:**
- Confianza ≥ 90% → el asiento se postea solo. Verás POSTEADO en verde
  con su hash.
- Confianza < 90% → va a la **Cola de Revisión**. Revisa la propuesta:
  **Aprobar y postear** si está bien, **Rechazar** (con razón) si no.
  El rechazo queda registrado; vuelve a describir la transacción con
  más detalle.

El header (la Ecuación Viva) se actualiza solo tras cada posting.

## 2. Preguntarle al libro mayor

En la pantalla del Agente, abajo: **"Pregúntale al libro mayor"**.
Preguntas en lenguaje natural, respuestas del ledger real:

- "¿Cuánto hay en el banco?"
- "¿Qué compré en Amazon?"
- "¿Mis 5 gastos más grandes del año?"
- "¿Cuánto gasté en Claude este mes?"
- "¿Cuánto se ha ido en SEISMIC?"
- "¿Cómo cerró junio?"

El agente **solo lee** — si le pides borrar o modificar algo, se niega.
Cada respuesta muestra qué consulta corrió y con qué confianza.

## 3. Facturas (AR/AP)

Pantalla **Facturas**, dos pestañas: Por cobrar / Por pagar.

**Emitir:** llena el formulario. La cuenta se filtra sola (ingresos
para AR, gastos para AP). Asigna proyecto si aplica. El asiento se
postea al emitir.

**Cobrar/Pagar:** botón en la fila → precarga el saldo pendiente
(edítalo para pagos parciales). Estados: `open → partial → paid`.

**Anular:** solo facturas `open` sin pagos. Razón obligatoria — queda
en la auditoría. La anulación hace el storno del asiento y marca la
factura `void`, todo junto.

**Aging:** la tira de arriba muestra la antigüedad de saldos por
bucket. Los vencidos se marcan en ámbar.

## 4. Activos fijos

Pantalla **Activos**. Para equipos que se capitalizan (no se gastan).

**Regla práctica:** compra nueva y significativa → activo fijo.
Compra menor o consumible → gasto normal por el Agente (5700/5900).

**Dar de alta:** nombre, fecha, costo, vida útil en meses (36-60 típico
para equipos), y **"Pagado con"**:
- Banco/Tarjeta → compra nueva.
- **Aporte del miembro (3100)** → equipo tuyo que entra a la empresa.
  Úsalo a **valor de mercado actual**, no al costo original. Un equipo
  viejo NUNCA entra por el banco: crearía una salida de dinero falsa.

**Depreciar:** elige el mes → "Correr período". Es idempotente: correr
dos veces el mismo mes no duplica nada. Hazlo una vez al mes (o cuando
te acuerdes — los meses saltados se corren después uno a uno).

## 5. Cierre de ejercicio (una vez al año)

En diciembre, con todo el año registrado:

1. `POST /closing/close-year` con `{"year": 2026}` — lleva ingresos y
   gastos a cero contra 3300 Resultados Acumulados, en un asiento.
2. **Después** bloquea los períodos del año (`POST /periods/{name}/lock`).

El orden importa: el asiento de cierre necesita diciembre abierto.
El cierre es idempotente: un año cerrado rebota con el número del
asiento existente.

## 6. Cuando algo sale mal: el storno

**Regla de oro: los asientos posteados no se editan ni se borran. Nunca.**
Se corrigen con reversión (storno), que crea el asiento espejo y deja
la historia completa auditable: el error, la corrección, y la razón.

```
POST /entries/{id}/reverse   body: {"reason": "por qué se revierte"}
```

Luego, si aplica, se postea el asiento correcto. El error queda en el
journal — eso no es suciedad, es auditoría.

**Para deshacer una transacción equivocada NO se inventa una
transacción espejo** (un "ingreso" para tapar un gasto, o viceversa):
eso cuadra la ecuación pero miente en los resultados. Storno siempre.

## 7. Señales de alarma — el sistema te está hablando

| Señal | Significado |
|---|---|
| Estampa **ROTO** en el Sello | La ecuación A = P + PN no cuadra. Bug grave o corrupción. Investigar YA. |
| **Banco en negativo** (sin sobregiro real) | Un asiento acreditó el banco por dinero que no salió. Buscar el asiento y stornear. |
| Footer: cadena **no íntegra** | El hash chain detectó manipulación del audit log. Máxima alerta. |
| Resultado neto que no reconoces | Ingresos o gastos ficticios (¿pruebas sin limpiar?). Revisar el journal. |
| Cuenta de gasto con saldo negativo | Un crédito de más (reembolso mal aplicado, storno duplicado). |

## 8. Reglas que nunca se rompen

1. **Nada escribe al ledger salvo el posting engine.** Ni SQL directo,
   ni "arreglitos" en la base. Las tablas de subledger (facturas,
   activos) sí son editables — el ledger no.
2. **Las pruebas no se hacen contra los libros reales.** Si no queda
   más remedio, el plan de limpieza (stornos + DELETEs del subledger)
   se define ANTES de la primera prueba.
3. **Decimal, jamás float.** Los montos viajan como string en JSON
   (salvo los endpoints sin response_model, que devuelven números).
4. **Los prompts del agente están versionados.** Cambiar el
   comportamiento del classifier = subir la versión del prompt.
5. **Verificación local antes de cada push:**
   `python -c "from app.main import app; print('OK')"`.

## 9. Reseteo total (borrón y cuenta nueva)

Solo para emergencias o re-arranques deliberados. Es **irreversible** —
considera un `pg_dump` antes.

1. En el Postgres de Railway: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
2. Redeploy del backend → Alembic reconstruye el schema completo.
3. En la shell del contenedor: `cd /app && python -m app.scripts.seed_vertex`
   y `python -m app.scripts.create_user`.
4. Verificar: Dashboard en ceros, Sello CUADRADO, cadena en GENESIS.
5. Re-registrar las transacciones reales por el Agente, con proyecto.

## 10. Rutina recomendada

| Frecuencia | Tarea |
|---|---|
| Al ocurrir | Registrar cada gasto/ingreso por el Agente, con proyecto |
| Semanal | Revisar la cola de propuestas pendientes · echar un ojo al Sello |
| Mensual | Correr la depreciación · revisar el aging de facturas · comparar el saldo 1100 contra el banco real |
| Anual (dic) | Cierre de ejercicio → bloquear períodos |



Version 2.0.0

# Guía de Operación — Cómo usar Kontia

Manual del operador. Cómo llevar la contabilidad día a día, qué hacer
cuando algo sale mal, y las reglas que nunca se rompen.

---

## 1. El día a día: registrar transacciones

Todo empieza en la pantalla **Agente**. Describe la transacción como se
la contarías a tu contador:

> "Pagué 5 de Railway con la tarjeta, para Seismic, el 4 de julio"

**Anatomía de una buena descripción:**
- **Qué y cuánto:** "pagué 47.32 de Railway"
- **Con qué:** "con la tarjeta" (→ 2200) / "del banco" o "pagué" a secas (→ 1100)
- **Para qué proyecto:** "para Kontia / Seismic / DentiaPro…" — sin esto,
  cae en GENERAL. Los gastos genuinamente generales (luz, teléfono,
  oficina) déjalos sin proyecto: GENERAL es su lugar correcto.
- **Cuándo:** "el 4 de julio" — la FECHA REAL de la transacción, no la
  de hoy. Esto importa muchísimo: la conciliación bancaria matchea por
  monto + fecha (±3 días); si registras con la fecha en que te
  acordaste, el matcher no encontrará el movimiento del banco.

**Qué pasa después:**
- Confianza ≥ 90% → el asiento se postea solo (POSTEADO en verde).
- Confianza < 90% → va a la **Cola de Revisión**: Aprobar o Rechazar
  (con razón).

El header (la Ecuación Viva) se actualiza solo tras cada posting.

## 2. Preguntarle al libro mayor

En la pantalla del Agente, abajo: **"Pregúntale al libro mayor"**.
Preguntas en natural, respuestas del ledger real: "¿cuánto hay en el
banco?", "¿qué compré en Amazon?", "¿mis 5 gastos más grandes?",
"¿cuánto se ha ido en SEISMIC?", "¿cómo cerró junio?".

El agente **solo lee** — pedirle borrar o modificar rebota.

## 3. Facturas (AR/AP)

Pantalla **Facturas**, dos pestañas: Por cobrar / Por pagar.

**Emitir:** el formulario filtra la cuenta sola (ingresos para AR,
gastos para AP). El asiento se postea al emitir.
**Cobrar/Pagar:** precarga el saldo pendiente (editable para parciales).
Estados: `open → partial → paid`.
**Anular:** solo `open` sin pagos, razón obligatoria — storno + `void`
en una sola operación.
**Aging:** la tira de antigüedad de saldos; vencidos en ámbar.

## 4. Activos fijos

Pantalla **Activos**. Para equipos que se capitalizan, no se gastan.

**Regla práctica:** compra nueva y significativa → activo fijo. Compra
menor o consumible → gasto normal por el Agente.

**Dar de alta — el campo "Pagado con" es crítico:**
- Banco/Tarjeta → compra nueva pagada por la empresa.
- **Aporte del miembro (3100)** → equipo TUYO que entra a la empresa,
  a **valor de mercado actual**. Un equipo viejo NUNCA entra por el
  banco: crearía una salida de dinero falsa (banco en negativo).

**Depreciar:** elegir el mes → "Correr período". Idempotente: correr
dos veces no duplica. Una vez al mes.

## 5. Conciliación bancaria (mensual)

Pantalla **Conciliación**. Compara el estado de cuenta del banco contra
lo registrado en Kontia. Es el chequeo de realidad mensual.

**Paso 1 — Importar:** sube el PDF digital del estado (descargado de la
banca en línea — una foto o escaneo no sirve). Claude extrae los
movimientos y el sistema los valida matemáticamente fila por fila: si
un solo monto no cuadra con el saldo corrido, la sesión completa se
rechaza. Una sesión aceptada es una extracción garantizada.

**Paso 2 — Leer los estados de cada movimiento:**

| Estado | Significado |
|---|---|
| `matched` (verde) | El sistema encontró el asiento en Kontia (mismo monto, fecha ±3 días). No requiere acción. |
| `pending` (ámbar) | El sistema NO lo encontró. Requiere TU decisión (paso 3). |
| `personal` (atenuado) | Lo marcaste como no-negocio. Se ignora. |
| `resolved` (latón) | Lo confirmaste como ya registrado o lo registraste. |

**Paso 3 — El árbol de decisión para cada `pending`. LÉELO DOS VECES,
aquí es donde se cometen los errores:**

```
¿Este movimiento es de la empresa?
├── NO (comida, personal, familia)
│       → botón "Es personal". Fin. El sistema lo recordará
│         el próximo mes ("¿Personal recurrente?" en ámbar).
│
└── SÍ  → ¿YA está registrado en Kontia?
        │   (Búscalo en Asientos, o pregúntale al libro mayor.
        │    OJO: puede estar registrado con OTRA FECHA — por eso
        │    quedó pending. Mismo monto + mismo concepto = ya existe.)
        │
        ├── SÍ, ya existe → botón ✓ (resolved). NO uses "Registrar":
        │       crearías un DUPLICADO y tus gastos quedarían inflados.
        │
        └── NO existe → botón "Registrar" → te lleva al Agente con la
                transacción pre-escrita → revísala, agrégale el
                proyecto, postea → vuelve y márcalo ✓.
```

**La regla de oro de la conciliación: `pending` NO significa "falta
registrar" — significa "el sistema no lo encontró solo". La causa más
común es una fecha distinta, no un registro faltante.** (Error real del
2026-07-11: la suscripción de Claude estaba registrada con fecha 07-09,
el banco decía 07-04 → quedó pending → se registró de nuevo → gasto
duplicado → hubo que stornear. Verifica antes de Registrar.)

**Ambigüedad deliberada:** dos movimientos del mismo monto en fechas
cercanas nunca se auto-matchean — quedan pending para tu ojo. Es
protección, no fallo.

## 6. Cierre de ejercicio (una vez al año)

En diciembre, con todo el año registrado:
1. `POST /closing/close-year` con `{"year": 2026}` — ingresos y gastos
   a cero contra 3300, en un asiento.
2. **Después** bloquear los períodos. El orden importa: el asiento de
   cierre necesita diciembre abierto.
Idempotente: un año cerrado rebota con el asiento existente.

## 7. Cuando algo sale mal: el storno

**Los asientos posteados no se editan ni se borran. Nunca.** Se
corrigen con reversión:

```
POST /entries/{id}/reverse   body: {"reason": "por qué"}
```

Luego, si aplica, se postea el asiento correcto. El error queda en el
journal — eso no es suciedad, es auditoría.

**NUNCA se inventa una transacción espejo** (un "ingreso" para tapar un
gasto): cuadra la ecuación pero miente en los resultados. Storno siempre.

## 8. Señales de alarma

| Señal | Significado |
|---|---|
| Estampa **ROTO** | La ecuación no cuadra. Investigar YA. |
| **Banco en negativo** (sin sobregiro real) | Un asiento acreditó dinero que no salió. Stornear. |
| Cadena **no íntegra** | Manipulación del audit log. Máxima alerta. |
| Resultado neto que no reconoces | Ingresos/gastos ficticios o duplicados. Revisar el journal. |
| Un **pasivo que no debes** (ej. tarjeta con saldo ya pagado) | Posible registro duplicado vía tarjeta. |
| Gasto con saldo negativo | Crédito de más (reembolso mal aplicado). |

## 9. Reglas que nunca se rompen

1. **Nada escribe al ledger salvo el posting engine.** Los subledgers
   (facturas, activos, conciliación) son editables — el ledger no.
2. **Las pruebas no se hacen contra los libros reales** sin plan de
   limpieza definido ANTES.
3. **Fechas reales al registrar** — la conciliación depende de eso.
4. **Antes de "Registrar" desde conciliación: verificar que no exista.**
5. **Decimal, jamás float.** Los prompts del agente, versionados.
6. **Verificación local antes de cada push:**
   `python -c "from app.main import app; print('OK')"`.

## 10. Reseteo total (emergencias)

Irreversible — `pg_dump` antes si hay dudas.
1. `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` en Railway.
2. Redeploy → Alembic reconstruye.
3. Shell del contenedor: `cd /app && python -m app.scripts.seed_vertex`
   y `create_user`.
4. Verificar: Dashboard en ceros, CUADRADO, cadena en GENESIS.
5. Re-registrar por el Agente, con proyecto y fecha real.

## 11. Rutina recomendada

| Frecuencia | Tarea |
|---|---|
| Al ocurrir | Registrar por el Agente: monto, medio, proyecto, FECHA REAL |
| Semanal | Cola de propuestas · ojo al Sello |
| Mensual | Depreciación · aging de facturas · **conciliar el estado de cuenta** |
| Anual (dic) | Cierre de ejercicio → bloquear períodos |