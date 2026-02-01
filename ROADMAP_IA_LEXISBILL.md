# Roadmap IA — LexisBill

Propuestas de implementación de Inteligencia Artificial ordenadas por impacto y esfuerzo.

---

## 0. Implementado (feb 2025) — sin APIs externas

| Funcionalidad | Dónde | Cómo |
|---------------|-------|------|
| **Insights y alertas con datos reales** | Dashboard → AIInsightWidget | `PredictiveService.getPredictiveAlerts({ ncfSettings, invoices, pendingCount })`: alertas NCF por agotarse, facturas pendientes, cliente recurrente. Ingresos mes anterior para comparación real. Todo con datos de tu cuenta. |
| **Texto → ítems factura** | Nueva factura, "comando mágico" | Lógica local en `AIService.parseInvoiceText`: palabras clave y heurísticas (ej. "consulta", "aire", "igual/mensual", número al final como precio). Sin ChatGPT ni APIs externas. |
| **Extracción en Gastos 606** | Gastos, subir imagen | Primero intenta QR (DGII). Si no hay QR, usa `AIService.extractExpenseData` (mock con datos de ejemplo). Sin APIs de visión; se puede completar manualmente. |

Lexis Bill no usa OpenAI ni otras APIs de pago para estas funciones.

---

## 1. Estado actual (mocks existentes)

| Funcionalidad | Ubicación | Estado |
|---------------|-----------|--------|
| Insight mensual | `ai-service-mock.ts` → AIInsightWidget | Reglas fijas |
| Predicción tareas fiscales | `ai-service-mock.ts` | Solo fechas |
| Texto → items factura | `ai-service-mock.ts` → nueva-factura | Regex/heurísticas |
| OCR gastos | `ai-service-mock.ts` → gastos | Mock aleatorio |
| Alertas predictivas | `predictive-service.ts` | Datos hardcodeados |

---

## 2. Prioridad alta (mayor impacto)

### 2.1 OCR de facturas para Gastos (606)

**Problema:** Hoy se usa un mock que devuelve datos aleatorios.

**Solución:** Integrar OCR real (Vision API) + LLM para extraer:
- Suplidor, RNC, NCF, monto, ITBIS
- Categoría DGII (01–11) sugerida por contexto

**Tecnologías:** Google Cloud Vision, Azure Form Recognizer o OpenAI Vision.

**Esfuerzo:** Medio (2–3 días).

---

### 2.2 Entrada por voz/texto natural → factura

**Problema:** `parseInvoiceText` usa palabras clave simples ("aire", "consulta", "igual").

**Solución:** LLM (OpenAI, Anthropic, Gemini) para:
- "3 consultas a 2,500 cada una más retorno de llamadas 500"
- "Mensualidad diciembre – igual que noviembre"

**Beneficio:** Menos clics, mejor UX para profesionales.

**Esfuerzo:** Medio (1–2 días).

---

### 2.3 Sugerencias de NCF y nombre fiscal

**Problema:** Sugerencias basadas en reglas fijas.

**Solución:** LLM que, dado RNC + tipo de cliente, sugiera:
- Tipo NCF más adecuado
- Nombre fiscal formateado
- Riesgo de error (ej. consumidor vs empresa)

**Esfuerzo:** Bajo–medio (1 día).

---

## 3. Prioridad media (valor añadido)

### 3.1 Chat de soporte con IA

**Problema:** Soporte abre solo WhatsApp.

**Solución:** Chatbot que:
- Responda preguntas fiscales básicas (606/607, NCF, ITBIS)
- Genere borradores de respuestas a DGII
- Escale a humano cuando no tenga respuesta

**Tecnologías:** OpenAI Assistant, LangChain + RAG con docs DGII.

**Esfuerzo:** Alto (3–5 días).

---

### 3.2 Insights y predicciones basadas en datos

**Problema:** Alertas y predicciones con datos ficticios.

**Solución:** Cálculos con datos reales:
- Riesgo de agotamiento de secuencias NCF
- Clientes con facturación recurrente
- Recordatorios de reportes 606/607 según historial
- Resumen mensual personalizado con LLM

**Esfuerzo:** Medio (2–3 días).

---

### 3.3 Detección de errores fiscales

**Solución:** IA que revise antes de emitir:
- Tipo NCF vs tipo de cliente
- ITBIS coherente con montos
- Categorías 606 fuera de rango
- Alertas tipo: "Este RNC suele facturarse como B01, no B02"

**Esfuerzo:** Medio (2 días).

---

## 4. Prioridad baja (futuro)

### 4.1 Recomendación de precios

- Sugerir precios por tipo de servicio según historial del usuario.
- Comparar con promedios de la profesión (si hay datos agregados).

### 4.2 Estimación de flujo de caja

- Predicción de cobros según facturas pendientes y historial de cobranza.

### 4.3 Panel CEO con IA

- Alertas de negocio (churn, nuevos usuarios, patrones de uso).
- Resúmenes ejecutivos automáticos.

---

## 5. Stack sugerido

| Uso | Herramienta | Coste aproximado |
|-----|-------------|------------------|
| OCR | Google Vision API | ~1.50 USD / 1000 docs |
| LLM general | OpenAI GPT-4o-mini | ~0.15 USD / 1M tokens |
| LLM local | Ollama (Llama 3) | Gratuito |
| RAG | Vercel AI SDK + Pinecone/Supabase | Variable |

---

## 6. Orden de implementación recomendado

1. **OCR Gastos** – impacto inmediato, flujo ya definido.
2. **Texto → items factura** – mejora directa en nueva-factura.
3. **Insights con datos reales** – sin LLM, solo lógica + BD.
4. **LLM para insights y sugerencias** – capa encima de los insights.
5. **Chat de soporte** – cuando haya presupuesto y docs preparados.

---

## 7. Consideraciones de coste y privacidad

- **Facturación:** Los datos son sensibles; usar proveedores con DPA y cifrado.
- **Tokens:** Priorizar modelos pequeños (GPT-4o-mini, Claude Haiku) para tareas simples.
- **Rate limits:** Cachear respuestas y sugerencias cuando sea posible.
- **Fallback:** Mantener reglas/heurísticas si la API falla o no responde a tiempo.
