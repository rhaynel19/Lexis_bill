# Uso de los datos de la plantilla de clientes y facturar más fácil

## Cómo se usan hoy los datos subidos

Cuando el usuario **sube una plantilla CSV/JSON** en **Mis Clientes**:

1. **Se crean o actualizan registros** en la base de datos (colección Customer): RNC, nombre, teléfono, email, notas.
2. Esos clientes **aparecen en el listado** de Mis Clientes y en el **autocompletado** de Nueva factura (buscar por RNC o nombre).
3. **Desde el listado** se puede:
   - **Facturar:** enlace a `/nueva-factura?rnc=...&name=...&phone=...` que precarga el cliente en el formulario.
   - **Cotizar:** enlace a `/nueva-cotizacion?rnc=...&name=...` para una cotización.
4. **Desde el drawer del cliente** (al hacer clic en una fila): botón **"Nueva Factura para este cliente"** que lleva a Nueva factura con ese cliente ya cargado.
5. En **Nueva factura**, si escribes un RNC que ya está en tu lista, se rellenan automáticamente nombre y teléfono.

Los datos de la plantilla (RNC, nombre, teléfono, email, notas) son la base para identificar al cliente y prellenar facturas y cotizaciones.

---

## Mejoras ya implementadas

- **Prioridad al cliente elegido:** Si entras a Nueva factura desde "Facturar" o desde el drawer del cliente (URL con `?rnc=` y/o `?name=`), ya **no se restaura el borrador** sobre ese cliente; se mantienen los datos del cliente seleccionado.
- **Drawer con CTA claro:** En el panel lateral del cliente, el botón **"Nueva Factura para este cliente"** lleva directamente a Nueva factura con RNC, nombre y teléfono en la URL y el formulario precargado.

---

## Ideas para facturar aún más fácil

### 1. **Después de subir la plantilla (primera vez)**

- Cuando el usuario sube la plantilla y hay **0 → N clientes**, mostrar un mensaje o banner: *"Listo. Tienes X clientes. ¿Quieres facturar a alguno?"* con un botón **"Ver listado"** o **"Ir a Nueva factura"**.
- En el listado vacío (antes de subir), el CTA puede ser: *"Sube una plantilla CSV o agrega tu primer cliente para empezar a facturar."*

### 2. **En Nueva factura: "Facturar de nuevo a…"**

- Mostrar una fila de **últimos 3–5 clientes a los que ya les facturaste** (por ejemplo desde el historial de facturas o desde los clientes con `lastInvoiceDate` más reciente).
- Un clic en uno de ellos rellena RNC, nombre y teléfono y, si se quiere en el futuro, podría sugerir ítems de la última factura a ese cliente (repetir factura).

### 3. **Sugerencia de ítems por cliente**

- Si el cliente tiene **facturas anteriores**, al elegirlo en Nueva factura se podría mostrar: *"Última factura a este cliente: [NCF]. ¿Usar los mismos ítems?"* con botón **"Sí, cargar ítems"** para copiar descripción, cantidades y precios (solo ítems, sin NCF ni fecha).

### 4. **Búsqueda rápida en Nueva factura**

- El campo **"Buscar cliente"** ya usa la lista de clientes (incluidos los de la plantilla). Mantener y, si hace falta, destacar que se puede buscar por **RNC o nombre** para elegir en un solo clic.

### 5. **Email / WhatsApp desde factura**

- Con los datos de la plantilla (email, teléfono), en la pantalla de **éxito** de la factura ya se puede ofrecer **"Enviar por WhatsApp"** o **"Enviar por email"** usando el teléfono o email del cliente si existen.

### 6. **Filtros y orden en Mis Clientes**

- Ordenar por **"Última factura"** (los que facturaste más recientemente primero) o por **nombre**.
- Filtro por **"Con factura en el último mes"** para enfocarse en clientes activos a la hora de facturar.

### 7. **Acceso rápido desde Dashboard**

- En el dashboard, un bloque **"Facturar a cliente frecuente"** con 3–5 clientes (por ejemplo los más facturados o los últimos facturados) y un botón **"Facturar"** en cada uno que lleve a Nueva factura con ese cliente.

---

## Resumen

- Los datos de la **plantilla** (RNC, nombre, teléfono, email, notas) se usan para **listar clientes**, **autocompletar** en facturas/cotizaciones y **precargar** el formulario cuando se elige "Facturar" o "Nueva Factura para este cliente".
- Con la **prioridad a la URL** y el **botón en el drawer**, facturar a un cliente determinado desde la lista o desde su ficha es más directo.
- Las ideas anteriores (últimos clientes, repetir ítems, envío por WhatsApp/email, filtros y dashboard) son pasos siguientes para que facturar sea aún más rápido y orientado al cliente.
