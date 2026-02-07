# Solución: Solicitudes Duplicadas en Pagos Pendientes

## Causa raíz identificada

### 1. **Creación prematura de PaymentRequest en `prepare-transfer`**

**Qué ocurría:**
- El endpoint `POST /api/membership/prepare-transfer` **creaba un PaymentRequest con status `pending`** cada vez que el usuario:
  - Entraba a `/pagos`
  - Seleccionaba "Transferencia bancaria"
  - Elegía un plan (Pro mensual/anual)
- El `useEffect` en `MembershipConfig` llamaba a `prepareTransfer` automáticamente al cambiar método/plan/ciclo.
- **No se requería comprobante ni confirmación de pago** para crear la solicitud.

**Consecuencia:**
- Usuarios que solo exploraban la pantalla de pago generaban solicitudes pendientes.
- Registros sin evidencia (sin comprobante subido) aparecían en Admin → Pagos Pendientes.
- Ruido operativo, aprobaciones incorrectas, mala experiencia administrativa.

### 2. **Falta de unicidad en base de datos**

- No existía un índice que garantizara un solo `pending` por usuario.
- Condiciones de carrera (doble clic, refresh, retries) podían crear duplicados.

### 3. **Admin mostraba solicitudes sin evidencia**

- El listado de pagos pendientes incluía todas las solicitudes `status: 'pending'`.
- No se filtraban las creadas por `prepare-transfer` (sin comprobante).

---

## Solución implementada

### 1. **prepare-transfer: NO crea PaymentRequest**

- Ahora solo **genera y devuelve** una referencia única `LEX-XXXX`.
- No persiste nada en la base de datos.
- El usuario puede ver la referencia para incluirla en su transferencia sin generar ruido en Admin.

### 2. **request-payment: crea PaymentRequest SOLO con evidencia**

- **Transferencia:** Se requiere `comprobanteImage` (captura de pantalla o foto del comprobante).
- **PayPal:** Se requiere la confirmación del checkbox ("Confirmo que envié el pago").
- La solicitud se crea únicamente cuando el usuario hace clic en "He realizado el pago" con evidencia válida.

### 3. **Índice único para evitar duplicados**

```javascript
paymentRequestSchema.index(
    { userId: 1 },
    { unique: true, partialFilterExpression: { status: 'pending' } }
);
```

- Un solo `PaymentRequest` con `status: 'pending'` por usuario.
- Previene duplicados por doble clic, refresh o condiciones de carrera.

### 4. **Admin: solo solicitudes con evidencia**

- El listado de pagos pendientes filtra:
  - `comprobanteImage` definido (transferencias)
  - O `paymentMethod: 'paypal'` (confirmación explícita)
- Las solicitudes legacy sin comprobante quedan ocultas.

### 5. **Estadísticas CEO coherentes**

- El contador de "Pagos pendientes" usa el mismo filtro que el listado Admin.
- Las métricas reflejan solo solicitudes con evidencia real.

---

## Flujo actual (correcto)

### Transferencia
1. Usuario entra a `/pagos` → selecciona transferencia y plan.
2. `prepare-transfer` devuelve `{ reference: "LEX-1234" }` (sin crear registro).
3. Usuario realiza la transferencia con esa referencia.
4. Usuario sube comprobante y hace clic en "He realizado el pago".
5. `request-payment` crea el PaymentRequest con comprobante → aparece en Admin.

### PayPal
1. Usuario entra a `/pagos` → selecciona PayPal y plan.
2. Usuario envía el pago externamente.
3. Usuario marca el checkbox de confirmación y hace clic en "He realizado el pago".
4. `request-payment` crea el PaymentRequest → aparece en Admin.

---

## Cómo evitar este problema en el futuro

1. **No crear registros de validación hasta que exista evidencia** (comprobante, referencia, confirmación de gateway).
2. **Usar índices únicos** para estados que deben ser exclusivos (ej. un `pending` por usuario).
3. **Manejar errores 11000 (duplicate key)** en MongoDB para dar mensajes claros al usuario.
4. **Frontend:** Mantener el botón deshabilitado durante el submit (`isSubmitting`) para evitar doble envío.
5. **Webhooks:** Si se integran gateways, guardar `event_id` e ignorar eventos ya procesados (idempotencia).

---

## Mejoras futuras recomendadas

- **Estados más granulares:** `awaiting_proof`, `under_review`, `approved`, `rejected`, `abandoned`.
- **Job de limpieza:** Marcar como `abandoned` las solicitudes pendientes sin comprobante creadas hace más de 48h (legacy).
- **Idempotency key:** Para `request-payment`, aceptar un header `Idempotency-Key` para evitar duplicados en retries.
