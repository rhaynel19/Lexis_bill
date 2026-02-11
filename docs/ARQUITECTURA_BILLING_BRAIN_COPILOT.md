# Arquitectura Unificada: Billing Brain + Copilot

## 🎯 Objetivo

Integrar el **Billing Brain** (motor de inteligencia financiera) dentro del **Copilot** (interfaz visible), creando una experiencia unificada donde el usuario percibe una sola inteligencia extremadamente competente.

**Principio clave:** "No hagas que el usuario piense. Haz que el sistema piense por él."

---

## 🧠 Arquitectura

### Billing Brain (Backend - Invisible)

**Ubicación:** `api/services/billing-brain.js`

**Responsabilidades:**
- Analizar continuamente datos financieros
- Generar insights proactivos priorizados
- Detectar eventos críticos automáticamente
- Clasificar insights por prioridad (crítico, importante, oportunidad)

**Análisis que realiza:**
1. **Críticos (🔴):**
   - Facturas sin cobrar
   - Facturas vencidas (>30 días)
   - Caída de ingresos significativa (>20%)

2. **Importantes (🟠):**
   - Clientes inactivos (>60 días)
   - Concentración de ingresos (>70% un cliente)
   - Facturas a crédito sin cobrar

3. **Oportunidades (🔵):**
   - Clientes recurrentes que podrían facturar más
   - Servicios más vendidos (patrones recurrentes)

**Salida:** Array de insights con:
- `priority`: critical | important | opportunity
- `humanMessage`: Mensaje en lenguaje natural
- `action`: Acción inmediata con URL y tipo
- `metadata`: Datos adicionales

---

### Copilot (Frontend - Visible)

**Ubicación:** `components/dashboard/LexisBusinessCopilot.tsx`

**Responsabilidades:**
- Consumir insights del Billing Brain
- Traducirlos a lenguaje humano
- Mostrar acciones inmediatas
- Ser proactivo (no esperar preguntas)

**Comportamiento:**
- **NO espera preguntas** → Inicia conversaciones inteligentes
- **Máximo 2 insights por sesión** → Evita saturación
- **Prioriza críticos** → Muestra primero lo más urgente
- **Acciones inmediatas** → Botones que resuelven el problema

---

## 🔥 Flujo de Datos

```
Usuario accede al Dashboard
    ↓
Copilot llama a /api/business-copilot
    ↓
Backend ejecuta análisis tradicional
    ↓
BillingBrain.analyze() procesa datos
    ↓
Genera insights priorizados
    ↓
Backend retorna: { ...datos_tradicionales, proactiveInsights: [...] }
    ↓
Copilot muestra insights con acciones inmediatas
```

---

## 📊 Sistema de Prioridades

### 🔴 Crítico
**Mostrar:** Inmediatamente  
**Ejemplos:**
- "Detecté RD$45,000 en facturas pendientes. ¿Quieres enviar recordatorios por WhatsApp ahora?"
- "Tienes 3 facturas vencidas por más de 30 días. La más antigua tiene 45 días."

**Acción:** Botón destacado con acción inmediata

### 🟠 Importante
**Mostrar:** En dashboard/feed  
**Ejemplos:**
- "El cliente 'Constructora Gama' no recibe facturas desde hace 60 días."
- "El 70% de tus ingresos provienen de un solo cliente. Esto puede ser un riesgo financiero."

**Acción:** Botón con acción sugerida

### 🔵 Oportunidad
**Mostrar:** Sugerencias suaves  
**Ejemplos:**
- "Cliente recurrente que podría facturar más. ¿Quieres crear una cotización?"
- "Servicio más vendido detectado. ¿Quieres configurarlo como servicio frecuente?"

**Acción:** Botón opcional

---

## 🎨 Experiencia de Usuario

### Diseño Premium Fintech

**Inspiración:**
- Stripe Dashboard
- Notion AI
- Slack AI

**Características:**
- ✅ Tarjetas dentro del Copilot (no popups invasivos)
- ✅ Mensajes contextuales
- ✅ Indicadores sutiles
- ✅ Feed inteligente

**NO usar:**
- ❌ Popups invasivos
- ❌ Notificaciones constantes
- ❌ Insights irrelevantes
- ❌ Lenguaje robótico

---

## 💬 Personalidad del Copilot

**Tono:**
- Claro
- Seguro
- Breve
- Inteligente

**Ejemplos:**

✅ **Correcto:**
- "Podrías estar dejando dinero sobre la mesa."
- "Detecté RD$45,000 en facturas pendientes."
- "Según tu actividad financiera..."

❌ **Incorrecto:**
- "Se detectó una anomalía en el flujo de facturación."
- "El sistema ha identificado inconsistencias..."
- "Error: código 404 en módulo de análisis"

---

## ⚙️ Motor de Reglas (Rule-Based Intelligence)

**Filosofía:** El 80% del valor viene de buenas reglas, no de ML complejo.

**Ejemplos de reglas:**

```javascript
// Regla: Facturas sin cobrar
IF facturas_pendientes > 0 AND total_pendiente > 0
THEN generar_insight_crítico("Facturas sin cobrar")

// Regla: Caída de ingresos
IF ingresos_mes_actual < ingresos_mes_anterior * 0.8
THEN generar_insight_crítico("Caída de ingresos")

// Regla: Cliente inactivo
IF cliente_recurrente AND días_sin_facturar >= 60
THEN generar_insight_importante("Cliente inactivo")

// Regla: Concentración de ingresos
IF cliente_top_pct >= 70
THEN generar_insight_importante("Alta dependencia")
```

---

## 📈 Métricas de Éxito

**Medir:**
1. % usuarios que interactúan con insights
2. Facturas recuperadas (después de insight)
3. Reducción de morosidad
4. Frecuencia de uso del Copilot
5. Retención mensual

**Objetivo:** Usuario siente que Lexis Bill cuida sus ingresos

---

## 🚀 Escalabilidad

### Fase 1: Rule-Based (Actual)
- ✅ Reglas simples y efectivas
- ✅ Análisis en tiempo real
- ✅ Insights inmediatos

### Fase 2: Machine Learning (Futuro)
- Detección de patrones complejos
- Predicción de morosidad
- Recomendaciones personalizadas

**Nota:** No empezar con ML hasta tener reglas sólidas.

---

## 🔧 Implementación Técnica

### Backend

**Archivo:** `api/services/billing-brain.js`

```javascript
const { BillingBrain } = require('./services/billing-brain');

// En endpoint /api/business-copilot
const brain = new BillingBrain(userId, invoices, customers, ncfSettings);
const insights = await brain.analyze();
const topInsights = insights.slice(0, 2); // Máximo 2 por sesión

res.json({
    ...datos_tradicionales,
    proactiveInsights: topInsights
});
```

### Frontend

**Archivo:** `components/dashboard/LexisBusinessCopilot.tsx`

```typescript
// Mostrar insights proactivos
{data.proactiveInsights?.map(insight => (
    <InsightCard 
        insight={insight}
        priority={insight.priority}
        action={insight.action}
    />
))}
```

---

## 🎯 Resultado Esperado

**El usuario debe sentir:**
- ✅ Que Lexis Bill cuida sus ingresos
- ✅ Que el sistema está pendiente
- ✅ Que no necesita revisar todo manualmente
- ✅ Dependencia operativa positiva

**Frase clave:** "Según tu actividad financiera..."

---

## 📋 Checklist de Implementación

- [x] Crear servicio BillingBrain
- [x] Integrar en endpoint /api/business-copilot
- [x] Actualizar interfaz BusinessCopilotData
- [x] Mostrar insights proactivos en Copilot
- [x] Agregar acciones inmediatas
- [x] Implementar sistema de prioridades
- [x] Limitar a máximo 2 insights por sesión
- [x] Documentar arquitectura

---

**Última actualización:** 2026-02-08
