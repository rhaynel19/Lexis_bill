# Recomendaciones para que el 606 sea siempre fácil para el usuario

Mejoras de usabilidad y producto para el módulo de Gastos 606 (reporte de compras).

---

## Ya implementado

| Mejora | Estado |
|--------|--------|
| Entrada manual sin escanear | ✅ Botón "Entrada manual (sin escanear)" |
| Subir comprobante dentro del formulario | ✅ "Subir comprobante (opcional)" en el diálogo |
| Formulario primero en móvil | ✅ En móvil se ve primero el formulario (Tipo de Gasto, Fecha, etc.) |
| Aviso de verificación del escaneo | ✅ Banner cuando los datos vienen del escaneo |
| Sin datos aleatorios al fallar OCR | ✅ Formulario vacío si no se puede extraer nada |
| Parser OCR mejorado | ✅ Pago/Food/RNC/ITBIS/fechas en inglés |

---

## Recomendaciones adicionales (fácil para el usuario)

### 1. **"Guardar y registrar otro"**
- **Qué:** Tras guardar un gasto, ofrecer el botón "Guardar y registrar otro" que deje el diálogo abierto, resetee el formulario y mantenga la imagen opcional (o la quite). Así el usuario puede cargar varios comprobantes seguidos sin cerrar y volver a abrir.
- **Dónde:** En el `DialogFooter` junto a "Guardar Gasto".

### 2. **Enlace directo a Reportes 606**
- **Qué:** En la página de Gastos 606, un enlace visible: "Ver y descargar reporte 606 → Reportes Fiscales" (con el periodo actual). Así el usuario sabe dónde va a parar lo que registra.
- **Dónde:** Debajo del subtítulo o en la card de "Gastos registrados".

### 3. **NCF opcional con mensaje claro**
- **Qué:** Si el backend lo permite, tratar NCF como opcional en comprobantes que no lo traen (tirillas, algunos tickets) y mostrar placeholder: "Ej: B0100001234. Si tu comprobante no trae NCF, deja vacío o escribe N/A y revisa con tu contador."
- **Nota:** Hoy el API puede requerir NCF; si se hace opcional, validar en backend y en el TXT 606 cómo reportar líneas sin NCF según DGII.

### 4. **Tip de foto en la primera acción**
- **Qué:** Junto al botón "Escaneo QR / Tirilla" o dentro del diálogo, un micro-texto: "Consejo: foto clara, comprobante plano y buena luz mejora la lectura automática."
- **Dónde:** Ya existe texto similar; se puede reforzar en el estado vacío del listado.

### 5. **Resumen del mes actual en la lista**
- **Qué:** En la lista de gastos, destacar "X gastos este mes" y "Total del mes: RD$ X" (filtrado por mes actual) para que el usuario vea de un vistazo si ya puede armar el 606.
- **Dónde:** Arriba de la tabla o en la card "Total del periodo" (ya existe; asegurar que el periodo sea claro).

### 6. **Desde Reportes, enlace a Gastos**
- **Qué:** En la página de Reportes Fiscales, junto al 606, un enlace: "¿Faltan gastos? Ir a Gastos 606" para que quien va a descargar el 606 pueda completar datos fácilmente.
- **Dónde:** En la card del reporte 606 o en el texto de ayuda.

### 7. **Sugerir tipo de gasto por nombre del suplidor**
- **Qué:** Según el nombre del suplidor (ej. "Real", "Hotel", "Restaurant", "Sushi"), sugerir "05 - Gastos de Representación"; si contiene "Super", "Bravo", "Ferretería", sugerir 01/02. No obligatorio, solo sugerencia al elegir categoría.
- **Dónde:** Al cambiar `supplierName` o al abrir el formulario con datos del escaneo.

### 8. **Validación amigable al guardar sin NCF**
- **Qué:** Si NCF está vacío al guardar, mostrar confirmación: "El NCF está vacío. Algunas tirillas no traen NCF. ¿Guardar igual?" [Sí] [No, completar]. Solo si el backend acepta NCF opcional o un valor tipo "N/A".

---

## Prioridad sugerida

1. **Corto plazo:** "Guardar y registrar otro" (1), enlace Gastos → Reportes (2), tip de foto (4).
2. **Medio plazo:** Enlace Reportes → Gastos (6), resumen del mes (5).
3. **Opcional:** NCF opcional + mensaje (3), sugerir tipo de gasto (7), confirmación sin NCF (8).

Si quieres, se puede bajar a cambios concretos en código para 1, 2 y 4.
