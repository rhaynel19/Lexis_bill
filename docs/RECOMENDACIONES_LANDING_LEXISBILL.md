# Recomendaciones de mejora — Landing Lexis Bill

**Objetivo:** Que el visitante entienda en 5 segundos qué es, para quién es y por qué le interesa.

**Archivo principal:** `app/(public)/page.tsx`

---

## Análisis del Hero actual

| Elemento | Estado actual | Problema |
|----------|---------------|----------|
| **Badge** | "EL ÚNICO SISTEMA QUE HABLA DOMINICANO 🇩🇴" | ✅ Muy bueno — diferenciación clara |
| **Headline** | "Tu talento merece orden, tu tiempo merece paz." | ❌ Genérico, no dice QUÉ es |
| **Subheadline** | "La asistencia de lujo para el profesional que factura con su RNC..." | ⚠️ Largo, no impacta en 5 segundos |
| **CTA** | "Probar 15 días GRATIS" | ✅ Claro |
| **Fricción** | "Activación inmediata. No requiere tarjeta." | ✅ Bueno |
| **Precio** | No visible en hero | ❌ Falta para quitar dudas |

---

## 1. Cambios recomendados (Hero — Above the fold)

### 1.1 Headline (PRINCIPAL)

**Actual:**
> Tu talento merece orden, tu tiempo merece paz.

**Propuesta:**
> Ponemos orden a tu facturación fiscal para que dejes de perder tiempo y vuelvas a tener control.

**Por qué:** Habla directo del dolor (caos fiscal, pérdida de tiempo), del beneficio (control) y del producto (facturación fiscal).

---

### 1.2 Subheadline (claridad + quitar fricción)

**Actual:**
> La asistencia de lujo para el profesional que factura con su RNC y desea delegar el caos. Lexis Bill organiza tus comprobantes autorizados y prepara tus reportes, hablando el único idioma que importa: el dominicano.

**Propuesta:**
> Facturas, NCF y cumplimiento DGII en un solo lugar. Pensado para profesionales dominicanos.

**Por qué:** En 5 segundos responde: ¿qué? (facturas, NCF, DGII), ¿para quién? (profesionales dominicanos). El texto actual tarda mucho en explicar.

---

### 1.3 Tercera línea (quitar fricción)

**Propuesta (nueva línea debajo del subheadline):**
> Configura en minutos. Sin contratos. Prueba gratis.

**Por qué:** Responde: "¿es complicado?" (no, minutos), "¿me ato?" (no), "¿cuánto cuesta probar?" (nada).

---

### 1.4 Mostrar precio en hero (opcional pero recomendado)

**Propuesta:** Debajo del botón "Probar 15 días GRATIS", agregar:

> **RD$950/mes** después del trial • Sin tarjeta para empezar

**Por qué:** Quita la duda del precio desde el inicio. Los profesionales buscan transparencia.

---

## 2. Estructura propuesta del Hero (orden visual)

```
[Badge] EL ÚNICO SISTEMA QUE HABLA DOMINICANO 🇩🇴

[Headline - grande]
Ponemos orden a tu facturación fiscal para que dejes de perder tiempo y vuelvas a tener control.

[Subheadline - mediano]
Facturas, NCF y cumplimiento DGII en un solo lugar. Pensado para profesionales dominicanos.

[Fricción - pequeño]
Configura en minutos. Sin contratos. Prueba gratis.

[CTA - botón]
Probar 15 días GRATIS

[Debajo del CTA]
RD$950/mes después del trial • Sin tarjeta para empezar
```

---

## 3. Cambios menores en otras secciones

### 3.1 Nav — Agregar CTA principal en desktop

**Actual:** "Entrar" (outline) como CTA principal para no logueados.

**Propuesta:** Añadir "Crear cuenta gratis" como botón dorado principal (como en mobile). El CTA principal debe ser registro, no login.

### 3.2 Sección "¿Es para mí?"

Ya está bien. Mantener.

### 3.3 Sección precios

**Actual:** "15 días para recuperar tu tranquilidad fiscal."

**Sugerencia opcional:** "RD$950/mes. La tranquilidad fiscal que tu negocio merece." — Más directo al precio.

---

## 4. Resumen de cambios por prioridad

| Prioridad | Cambio | Impacto |
|-----------|--------|---------|
| **P0** | Headline nuevo | Alto — define el valor en 5 segundos |
| **P0** | Subheadline corto | Alto — claridad inmediata |
| **P1** | Línea "Configura en minutos..." | Medio — reduce fricción |
| **P1** | Precio visible en hero | Medio — transparencia |
| **P2** | CTA "Crear cuenta" en nav desktop | Bajo — más conversión |

---

## 5. Mantener (estilo Lexis Bill)

- ✅ Colores: `lexis-bg-deep`, `lexis-gold`, `lexis-text-light`
- ✅ Tipografía: `font-serif` en headlines
- ✅ Badge "EL ÚNICO SISTEMA QUE HABLA DOMINICANO 🇩🇴"
- ✅ Tono premium, cercano, dominicano
- ✅ Estructura de secciones (Dolor, ¿Es para mí?, Cómo funciona, Beneficios, Precio)

---

## 6. Textos finales sugeridos (copy-paste)

### Hero completo

**Badge:** `EL ÚNICO SISTEMA QUE HABLA DOMINICANO 🇩🇴`

**Headline:** `Ponemos orden a tu facturación fiscal para que dejes de perder tiempo y vuelvas a tener control.`

**Subheadline:** `Facturas, NCF y cumplimiento DGII en un solo lugar. Pensado para profesionales dominicanos.`

**Fricción:** `Configura en minutos. Sin contratos. Prueba gratis.`

**CTA:** `Probar 15 días GRATIS`

**Debajo CTA:** `RD$950/mes después del trial • Sin tarjeta para empezar`

---

¿Proceder con la implementación de estos cambios en el código?
