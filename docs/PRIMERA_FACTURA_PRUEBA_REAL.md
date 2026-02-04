# Guía: Primera factura (prueba real)

Checklist para que un usuario nuevo pueda emitir su **primera factura** en Lexis Bill sin bloqueos.

---

## Requisitos previos (en este orden)

### 1. Registrarse
- Ir a **Registro** y crear cuenta (email, contraseña, nombre, RNC).
- Plan por defecto: **Trial/Free** (5 facturas/mes; suficiente para la prueba).

### 2. Completar configuración inicial (Onboarding)
- Tras el login, si es usuario nuevo, la app llevará a **Configuración inicial**.
- Completar:
  - **RNC o Cédula** (9 o 11 dígitos).
  - **Nombre fiscal (razón social)** — el que aparecerá en la factura.
  - **Dirección** (obligatoria).
- Guardar. Con esto ya puede emitir facturas (nombre fiscal confirmado).

### 3. Configurar al menos un lote de NCF
- Ir a **Configuración** (menú) → sección **Gestión de Comprobantes (NCF)**.
- **Agregar un lote:**
  - **Modo:** Factura Electrónica (E) o Tradicional (B).
  - **Tipo:** Por ejemplo **E32 - Consumo** (consumidor final) o **B02 - Consumo**.
  - **Desde / Hasta:** Números autorizados por la DGII (ej. 1 a 100).  
    Para prueba puede usar un rango de prueba; en producción deben ser los números reales autorizados.
  - Clic en **Agregar Lote**.
- Sin al menos un lote activo, al emitir factura aparecerá: *"No hay secuencias NCF disponibles. Configure un lote en Configuración."*

### 4. Emitir la factura
- Ir a **Nueva factura**.
- **Cliente:** Nombre del cliente.
- **RNC/Cédula:** 9 dígitos (empresa) u 11 (persona). Se puede usar el botón de búsqueda para rellenar el nombre si está configurada la consulta RNC.
- **Tipo de comprobante:** Elegir el que coincida con el lote configurado (ej. E32 o B02 para consumo).
- **Ítems:** Descripción, cantidad, precio. ITBIS y total se calculan solos.
- **Guardar / Emitir factura**.

---

## Posibles mensajes de error y qué hacer

| Mensaje | Qué hacer |
|--------|-----------|
| *"Completa la configuración inicial antes de emitir facturas"* | Completar el onboarding (paso 2). |
| *"Confirma tu nombre fiscal en el dashboard"* | El nombre fiscal se confirma en la configuración inicial; si ya la hizo y sigue saliendo, en Dashboard puede haber un aviso para confirmar de nuevo. |
| *"No hay secuencias NCF disponibles..."* | Agregar al menos un lote de NCF en Configuración → Comprobantes (paso 3). |
| *"Límite del plan Free alcanzado"* | Plan Free = 5 facturas/mes. Para la primera factura no aplica; si ya emitió 5 este mes, tendría que esperar o actualizar plan. |
| *"Tu membresía ha expirado"* | En Trial la vigencia es limitada; revisar en Configuración → Membresía o contactar soporte. |

---

## Resumen rápido para tu amiga

1. **Registro** → email, contraseña, nombre, RNC.
2. **Completar configuración inicial** → RNC, nombre fiscal (razón social), dirección. Guardar.
3. **Configuración** → **Comprobantes** → **Agregar lote** (ej. E32 Consumo, del 1 al 100). Agregar lote.
4. **Nueva factura** → Cliente, RNC, tipo de comprobante (ej. E32), ítems. Emitir.

Con eso el sistema está listo para que emita su primera factura en la prueba de mañana.
