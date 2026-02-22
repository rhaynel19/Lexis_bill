# Proceso de Nota de Crédito — Lexis Bill

## Flujo actual (frontend)

1. **Dónde se inicia**
   - **Dashboard** → Centro de control de facturas (listado de facturas).
   - En cada fila hay un botón de acción **"Emitir nota de crédito"** (icono de documento).

2. **Paso 1: Abrir modal**
   - Al hacer clic se abre `CreditNoteModal` con la factura seleccionada.
   - Se muestra:
     - Título: "Anular Factura"
     - Texto: "Se generará una **Nota de Crédito (e-CF 34)** para anular este monto."
     - Factura original: últimos 11 caracteres del NCF, nombre del cliente.
     - Listado de ítems (descripción y monto).
     - **Total a creditar** (total de la factura).
     - Aviso: "Esta acción es irreversible en el sistema fiscal..."

3. **Paso 2: Confirmar**
   - El usuario hace clic en **"Confirmar Anulación"**.
   - El frontend llama a `api.createCreditNote(invoiceId)` → **POST** `/api/invoices/:invoiceId/credit-note`.

4. **Paso 3: Respuesta esperada**
   - La API debe devolver `{ ncf: "E34XXXXXXXX" }` (NCF de la nota de crédito).
   - El modal pasa a pantalla de éxito: "Anulación Exitosa", muestra el NCF y botón "Regresar al Listado".
   - Se ejecuta `onSuccess()`: cierra el modal, refresca el listado y muestra toast "Nota de crédito aplicada correctamente."

## Componentes involucrados

| Archivo | Rol |
|--------|-----|
| `components/dashboard/InvoiceControlCenter.tsx` | Listado de facturas, botón "Emitir nota de crédito", estado del modal, `CreditNoteModal`. |
| `components/CreditNoteModal.tsx` | Modal de confirmación, llamada a `createCreditNote`, pantalla de éxito con NCF. |
| `lib/api-service.ts` | `createCreditNote(invoiceId)` → POST `/api/invoices/${invoiceId}/credit-note`. |

## Backend (implementado)

- **Endpoint:** `POST /api/invoices/:invoiceId/credit-note` (auth con `verifyToken`).
- **Comportamiento:**
  1. Verifica suscripción activa (no SUSPENDED/CANCELLED/PAST_DUE).
  2. Busca la factura por `_id` y `userId`; si no existe → 404.
  3. Si la factura ya tiene `annulledBy` o `status: 'cancelled'` → 400.
  4. Decide tipo de NC: si la factura original es electrónica (ncfType empieza por `3`) usa **34** (e-CF), si no **04** (B04).
  5. Obtiene el próximo NCF con `getNextNcf(userId, '34' o '04', session, clientRnc)` — **el usuario debe tener un lote configurado para 34 o 04** en Configuración.
  6. Crea un nuevo documento `Invoice` (nota de crédito): mismo cliente, ítems, totales; `ncfSequence: fullNcf`, `modifiedNcf: ncfFacturaOriginal`, `status: 'paid'`.
  7. Actualiza la factura original: `status: 'cancelled'`, `annulledBy: fullNcf`.
  8. Responde `201` con `{ ncf: "E34XXXXXXXX", message: "Nota de crédito emitida correctamente" }`.
- **Requisito:** Tener configurado en la app un lote NCF para **E34** (recomendado) o **B04** según el tipo de facturas que emita el usuario.

## Tipos NCF relacionados (DGII)

- **04** — B04 Nota de Crédito (papel)
- **34** — E34 Nota de Crédito Electrónica (e-CF)

En la app, el modal menciona **e-CF 34**; la secuencia a usar depende de los lotes NCF configurados por el usuario (tipo 34 o 04).

## Notas

- La factura original en el modelo `Invoice` tiene campos `annulledBy` y `modifiedNcf` para vincular la anulación.
- Para cumplir con DGII, la nota de crédito debe referenciar el NCF de la factura que anula y el monto/totales deben ser consistentes.
