# Mejoras Gastos 606 (Lexis Bill)

Lista de mejoras para el módulo de gastos 606, basada en la pantalla de entrada manual y el flujo actual.

---

## Ya identificadas / en camino

| Mejora | Descripción | Prioridad |
|--------|-------------|-----------|
| **Forma de pago (DGII)** | El reporte 606 incluye forma de pago (01 Efectivo, 02 Cheque, 03 Tarjeta, etc.); el modelo ya tiene `paymentMethod` pero el formulario no lo pide. | Alta |
| **Validación en tiempo real** | Validar RNC (9 u 11 dígitos), formato NCF (B01..., E32...), monto > 0; mostrar error bajo cada campo antes de guardar. | Alta |
| **Suplidores frecuentes** | Autocompletar suplidor y RNC desde gastos ya registrados (como en facturas con clientes). | Media |
| **Filtros funcionales** | El botón "Filtros" no hace nada. Añadir filtro por periodo (mes/año), por categoría DGII y por rango de fechas. | Media |

---

## UX y datos

- **Editar gasto:** Hoy solo se puede eliminar. Añadir edición (modal o inline) para corregir suplidor, NCF, monto, categoría, fecha.
- **Vincular comprobante al guardar:** La foto/PDF que se sube en el modal no se envía al backend; el modelo tiene `imageUrl`. Guardar comprobante (ej. base64 o almacenamiento) y asociarlo al gasto.
- **ITBIS opcional calculado:** Opción "Calcular 18% (o 16%)" sobre monto base cuando ITBIS se deja vacío, según tipo de comprobante.
- **Sugerencia de categoría:** Por nombre de suplidor (ej. "Altice" → 02 Trabajos y servicios) o por las últimas categorías usadas.
- **NCF vacío:** Si la tirilla no trae NCF, hoy no se puede guardar (es requerido). Valorar permitir NCF opcional con aviso claro y cómo impacta el 606 ante la DGII.

---

## Reporte y auditoría

- **Tarjetas de resumen reales:** "Salud Fiscal 88%" y "Reporte 606 Pendiente" están estáticas. Usar datos reales: % de gastos con datos completos, último periodo generado, enlace a descargar 606.
- **Exportar lista a Excel/CSV:** Descargar el listado de gastos del periodo (o filtrado) para revisión antes de enviar el 606.

---

## Escaneo y OCR

- **Mensaje cuando falla el escaneo:** Dejar claro que puede completar manualmente y que la foto se puede subir después (opcional).
- **Re-escanear sin cerrar:** Permitir subir otra imagen para re-intentar QR/OCR sin cerrar el modal ni perder los datos ya escritos.
- **PDF multi-página:** Si suben un PDF de varias páginas, extraer o marcar qué página usar para el gasto actual.

---

## Avanzado

- **Importación masiva:** CSV/Excel con columnas: suplidor, RNC, NCF, monto, ITBIS, categoría, fecha (y opcional forma de pago).
- **Recordatorio mensual:** Notificación o email recordando registrar gastos y descargar el 606 antes del cierre (integrar con el recordatorio 606/607 existente).
