# Formato 606/607 DGII — Lexis Bill

Referencia de los campos incluidos en los reportes 606 y 607 generados por Lexis Bill, según Norma DGII 07-2018 / 05-2019.

## Reporte 607 (Ventas)

**Cabecera:** `607|RNC_EMISOR|PERIODO_YYYYMM|CANTIDAD_REGISTROS`

**Columnas por línea (19):**

| # | Campo DGII | Descripción | En Lexis Bill |
|---|------------|-------------|----------------|
| 1 | RNC/Cédula | RNC o cédula del cliente | `clientRnc` (9 o 11 dígitos) |
| 2 | Tipo ID | 1 = RNC, 2 = Cédula | 1 si 9 dígitos, 2 si 11 |
| 3 | NCF | Número del comprobante fiscal | `ncfSequence` |
| 4 | NCF Modificado | Nota de crédito/débito si aplica | `modifiedNcf` |
| 5 | Tipo de ingreso | 01–06 DGII | 01 (venta bienes/servicios) |
| 6 | Fecha comprobante | YYYYMMDD | Fecha de la factura |
| 7 | Fecha retención | YYYYMMDD si aplica | Vacío si no hay retención |
| 8 | Monto facturado | Subtotal | `subtotal` |
| 9 | ITBIS facturado | ITBIS cobrado | `itbis` |
| 10 | Renta retenida | ISR retenido por terceros | `isrRetention` |
| 11 | ITBIS retenido | ITBIS retenido por terceros | `itbisRetention` |
| 12–14 | Selectivo / Propina / Otros | 0.00 si no aplica | 0.00 |
| 15 | Monto total | Total factura | `total` |
| 16–19 | Otros | 0.00 si no aplica | 0.00 |

**Modelo Invoice:** Se añadieron `isrRetention` e `itbisRetention` para completar el formato 607.

---

## Reporte 606 (Compras / Gastos)

**Cabecera:** `606|RNC_EMISOR|PERIODO_YYYYMM|CANTIDAD_REGISTROS`

**Columnas por línea (mínimo 10):**

| # | Campo DGII | Descripción | En Lexis Bill |
|---|------------|-------------|----------------|
| 1 | RNC/Cédula suplidor | RNC o cédula del proveedor | `supplierRnc` |
| 2 | Tipo ID | 1 = RNC, 2 = Cédula | 1 si 9 dígitos, 2 si 11 |
| 3 | Categoría | 01–11 DGII (tipo de gasto) | `category` |
| 4 | NCF | NCF del comprobante de compra | `ncf` |
| 5 | NCF Modificado | Si aplica | Vacío |
| 6 | Fecha | YYYYMMDD | Fecha del gasto |
| 7–10 | Montos / ITBIS | Monto total, ITBIS, etc. | `amount`, `itbis` |
| 11 | Forma de pago | 01 Efectivo, 02 Cheque, 03 Tarjeta, etc. | `paymentMethod` (default 01) |

**Modelo Expense:** Se añadió `paymentMethod` (default `'01'`) para forma de pago.

**Categorías DGII (606):** 01–11 según tabla de gastos de la DGII.

---

## Pre-validación

- Los archivos generados pueden pre-validarse con la herramienta oficial de la DGII antes de subirlos a la Oficina Virtual.
- Lexis Bill valida formato (cabecera, columnas, fechas YYYYMMDD, números) en `api/dgii-validator.js`.
