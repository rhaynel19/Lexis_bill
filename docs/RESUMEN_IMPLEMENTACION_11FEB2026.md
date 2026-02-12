# Resumen de lo realizado y para qué sirve cada parte

**Fecha:** 11 de febrero de 2026  

---

## 1. Lo realizado hoy (11 feb 2026)

### 1.1 Arreglo del componente Progress (UI)

- **Archivo:** `components/ui/progress.tsx`
- **Problema:** El linter marcaba que no se debían usar estilos inline (línea 24: `style={{ width: ... }}`).
- **Solución:**
  - Se creó `components/ui/progress.module.css` con la clase `.progressBar` y la variable CSS `--progress-width`.
  - En el componente se eliminó el `style` en JSX y se usa un `ref` + `useLayoutEffect` para asignar `--progress-width` con `setProperty`, de modo que el ancho dinámico siga funcionando sin estilo inline.
- **Para qué sirve:** Cumplir la regla de no usar estilos inline y mantener el mismo aspecto y comportamiento de la barra de progreso en toda la app (dashboard, widgets, etc.).

---

## 2. Billing Brain (motor de inteligencia financiera)

- **Ubicación:** `api/services/billing-brain.js`
- **Qué es:** Servicio de backend que analiza facturas, clientes y configuración NCF y genera **insights proactivos** priorizados.
- **Para qué sirve:**
  - Detectar problemas y oportunidades sin que el usuario tenga que buscarlos.
  - Clasificar insights en: **críticos** (dinero en riesgo), **importantes** (tendencias/riesgos) y **oportunidades** (crecimiento).
  - Entregar mensajes en lenguaje natural y acciones concretas (por ejemplo “Enviar recordatorios”, “Ver facturas vencidas”) que el Copilot muestra en el dashboard.

**Análisis que hace:**

| Prioridad | Ejemplos |
|-----------|----------|
| Crítico   | Facturas sin cobrar, facturas vencidas (>30 días), caída fuerte de ingresos (>20 %) |
| Importante| Clientes inactivos (>60 días), concentración de ingresos en un cliente (>70 %), facturas a crédito sin cobrar |
| Oportunidad | Clientes recurrentes que podrían facturar más, servicios más vendidos / patrones recurrentes |

**Salida:** Lista de insights con `priority`, `humanMessage`, `action` (label, url, type) y `metadata`. El API los devuelve en el endpoint del Copilot y el frontend los muestra en el dashboard.

---

## 3. Copilot (Lexis Business Copilot)

- **Ubicación:** `components/dashboard/LexisBusinessCopilot.tsx`
- **Qué es:** Interfaz del asistente de negocio en el dashboard (panel visible).
- **Para qué sirve:**
  - Mostrar los insights que genera el Billing Brain con mensajes claros y botones de acción.
  - No esperar a que el usuario pregunte: inicia conversaciones proactivas (máximo ~2 insights por sesión para no saturar).
  - Priorizar lo crítico y ofrecer acciones inmediatas (recordatorios WhatsApp, ir a documentos, etc.).

**Flujo:** Usuario entra al dashboard → frontend llama a `/api/business-copilot` → backend hace el análisis tradicional y ejecuta `BillingBrain.analyze()` → devuelve `proactiveInsights` → el Copilot los pinta con colores por prioridad (rojo/ámbar/azul) y botones de acción.

---

## 4. Otras partes principales del proyecto (y para qué sirven)

| Parte | Para qué sirve |
|-------|-----------------|
| **Seguridad (JWT, cookies)** | Autenticación con cookie `lexis_auth` HttpOnly; sin token en URLs ni en el body del login. |
| **Middleware** | Proteger rutas (dashboard, cotizaciones, reportes, etc.) y redirigir a login si no hay sesión válida. |
| **NCF (getNextNcf)** | Asignar NCF válidos según DGII: unicidad, vigencia del rango, tipo de cliente (B01/B02/B15, E31/E32/E15). |
| **Reporte 607** | Exportar ventas en formato DGII (Norma 06-2018/07-2018) para presentación fiscal. |
| **Reporte 606** | Exportar gastos desde la colección Expenses, con validación de NCF suplidor y categorías DGII 01–11. |
| **Cotizaciones (Quotes)** | Crear, editar y listar cotizaciones; convertir una cotización en factura sin duplicar. |
| **Progress (componente)** | Barras de progreso reutilizables en toda la app (porcentaje según `value`/`max`), ahora con estilos en CSS externo. |

---

## 5. Resumen en una frase

- **Hoy:** Se corrigió el warning de estilos inline en el componente Progress moviendo el ancho dinámico a un archivo CSS y una variable CSS.
- **Billing Brain:** Motor en backend que analiza datos y genera insights priorizados para que el Copilot los muestre de forma proactiva en el dashboard.
- **Copilot:** Interfaz que muestra esos insights y ofrece acciones inmediatas al usuario.
