# Facturar de nuevo — Diseño y arquitectura

## 1. Objetivo

Permitir reutilizar los datos de una factura ya emitida para crear una **nueva factura en borrador**, sin duplicar NCF, fecha ni datos fiscales sensibles. La nueva secuencia NCF se asigna solo al **confirmar y emitir**.

## 2. Flujo de usuario

```
[Listado facturas] → Clic "Facturar de nuevo" → [Validaciones backend] → Borrador creado
       → Redirección a /nueva-factura?from=id&fromNcf=E32...
       → Banner: "Estás creando una nueva factura basada en la Factura #E32..."
       → Formulario precargado (cliente, ítems, ITBIS, tipo pago, tipo comprobante)
       → Usuario edita si desea y pulsa "Confirmar y emitir" → Nueva factura con nuevo NCF
```

## 3. Endpoint propuesto

**POST** `/api/invoices/:id/duplicate`

| Aspecto | Detalle |
|---------|---------|
| Auth | `verifyToken` — solo el dueño de la factura |
| Input | `id` = ID de la factura original |
| Respuesta éxito | `201` + `{ success: true, fromInvoiceId, fromInvoiceNcf }` |
| Transacción | Sí (lectura factura + escritura borrador) |

**Validaciones obligatorias**

- Factura existe y `userId` coincide (no acceso cruzado).
- Factura **no** está anulada: `status !== 'cancelled'` y `!annulledBy`.
- Cliente sigue existiendo: al menos existe en la factura; opcionalmente comprobar en `Customer` si se usa CRM.
- No se copia NCF, fecha, estado, número interno ni código de autorización.
- Rango NCF no se valida aquí (se valida al emitir).

**Campos que se copian al borrador**

- Cliente: `clientName`, `clientRnc`
- Ítems: `items` (descripción, cantidad, precio, isExempt)
- ITBIS / totales: implícitos en ítems; tipo comprobante `ncfType`
- Condiciones de pago: `tipoPago`, `tipoPagoOtro`, `pagoMixto`

**Campos que NO se copian**

- NCF, fecha, estado, annulledBy, modifiedNcf, montoPagado, balancePendiente, estadoPago, fechaPago

## 4. Modelo de datos

- **Invoice** (existente): sin cambios; no se crea factura en estado "draft".
- **InvoiceDraft** (existente, ampliado): un borrador por usuario. Se añaden campos opcionales para soportar "Facturar de nuevo":
  - `tipoPago` (String)
  - `tipoPagoOtro` (String)
  - `pagoMixto` (Array de `{ tipo, monto }`)
  - El borrador se guarda con estos datos; la página de nueva factura los usa al cargar el draft.

No se añade `fromInvoiceId` al borrador: el origen se lleva en la URL (`?from=id&fromNcf=...`) para mostrar el banner.

## 5. Edge cases y protección

| Caso | Medida |
|------|--------|
| Doble clic en "Facturar de nuevo" | Botón deshabilitado + estado `isDuplicating` mientras dura la petición; una sola redirección. |
| Factura original anulada | Backend responde 400: "No se puede reutilizar una factura anulada." |
| Cliente eliminado | Backend: si se exige validar en CRM, 400 si no existe; si no hay CRM, se usa clientName/clientRnc de la factura. |
| Rango NCF agotado | No se valida en duplicate; al "Confirmar y emitir" el flujo actual ya valida y devuelve error. |
| Descuento / venta a crédito | Se copian `tipoPago` y `pagoMixto`; si hubiera campo descuento en el modelo, se copiaría. |
| Generación en paralelo | Transacción en duplicate; un solo borrador por usuario (upsert), no hay duplicado de NCF porque no se asigna NCF en duplicate. |
| Inconsistencias en BD | Transacción MongoDB en el endpoint de duplicate. |

## 6. Posibles errores críticos

- **404** Factura no encontrada o no pertenece al usuario.
- **400** Factura anulada o cancelada.
- **400** Cliente inexistente (si se valida en CRM).
- **500** Fallo de BD o transacción; rollback y mensaje genérico.

## 7. Seguridad

- Verificación de token JWT en `verifyToken`.
- Toda consulta de factura con `userId: req.userId` para evitar acceso cruzado.
- No se expone NCF de otros usuarios; el NCF devuelto en `fromInvoiceNcf` es el de la factura del propio usuario.

## 8. Riesgo si escala a 1.000 usuarios concurrentes

- **Carga**: Un duplicate por usuario es una lectura de Invoice + una escritura (upsert) de InvoiceDraft; transacciones cortas.
- **Contención**: El borrador es un documento por usuario; el upsert por `userId` puede generar contención en escritura en el mismo documento si un usuario hace muchos "Facturar de nuevo" muy seguido (poco probable).
- **Recomendación**: Mantener transacciones cortas; si crece el tráfico, considerar índice por `userId` en Invoice (ya existe) y monitorear latencia de escritura en InvoiceDraft. No se generan NCF en duplicate, por tanto no hay riesgo de agotar secuencias por concurrencia en este flujo.

## 9. UX en listado

- Botones por factura: **Ver** | **Descargar** | **Enviar** (WhatsApp) | **Anular** (nota de crédito) | **Facturar de nuevo**.
- "Facturar de nuevo" solo visible/habilitado si la factura no está anulada (`status !== 'cancelled'` y `!annulledBy`).
- Al hacer clic: spinner o deshabilitar botón, llamada a `POST /api/invoices/:id/duplicate`, luego redirección a `/nueva-factura?from=id&fromNcf=...` y banner informativo.
