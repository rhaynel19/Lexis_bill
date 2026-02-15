# Estrategia de IA para Lexis Bill — Evaluación para modelo propio

**Rol:** Chief AI Officer (CAIO) — decisión estratégica, no académica.  
**Objetivo:** Definir si Lexis Bill debe usar modelo fundacional, modelo propio o híbrido, y el roadmap de madurez de IA.

---

## Recomendación en una frase

**No entrenes un modelo propio todavía. Construye la arquitectura híbrida hoy: LLM fundacional + RAG con tus datos DGII/facturación + motor de reglas (Billing Brain) como orquestador. El modelo propio solo se justifica cuando tengas escala de datos y uso que ningún LLM genérico puede emular.**

---

## 1. ¿Vale la pena crear un modelo propio?

### Respuesta directa: **Aún no.**

| Criterio | Hoy (Lexis Bill) | Umbral para modelo propio |
|----------|-------------------|----------------------------|
| Usuarios activos | Crecimiento temprano | >50k–100k usuarios con uso intensivo |
| Facturas/datos | Miles | Decenas de millones de facturas + eventos |
| Dominio | DGII, facturación RD | Corpus único: lenguaje fiscal RD + patrones que solo vos tenés |
| Costo entrenamiento | — | $500k–2M+ (data, infra, equipo) y 12–24 meses |
| Riesgo | Bajo si usás API | Alto: modelo mediocre = dinero y tiempo perdidos |

**Cuándo SÍ tiene sentido:** Cuando el valor venga de **patrones que solo Lexis Bill puede ver** (ej. “en tu sector en RD, quienes facturan así cobran 18% más tarde”) y tengas suficientes datos para entrenar sin sobreajuste. Eso suele llegar después de 3–5 años de producto con tracción.

**Costos reales vs beneficios hoy:**
- **Modelo propio ahora:** Costo alto, beneficio bajo (pocos datos, mismo resultado que LLM + RAG).
- **Híbrido (LLM + RAG + Billing Brain):** Costo acotado (APIs + embeddings + tu código), beneficio alto (diferenciación con datos DGII y de facturación).

**Riesgos técnicos de un modelo propio prematuro:**
- Modelo que no supera a GPT/Claude en tu dominio.
- Equipo y tiempo desviados del producto que genera datos.
- Deuda de infra (MLOps, evaluación, gobernanza) antes de tener escala.

---

## 2. Arquitectura ideal (y por qué es ventaja competitiva)

La estructura que recomendamos es **híbrida en capas**, no “un solo modelo”.

```
┌─────────────────────────────────────────────────────────────────┐
│  CAPA DE EXPERIENCIA (Copilot / UX)                              │
│  Una sola voz: “Tu inteligencia fiscal”                         │
└─────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────┐
│  ORQUESTADOR (Billing Brain v2)                                  │
│  Decide: ¿regla? ¿RAG? ¿LLM? ¿predicción?                        │
└─────────────────────────────────────────────────────────────────┘
         │                │                │                │
         ▼                ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Motor        │  │ RAG          │  │ LLM          │  │ Motor        │
│ de reglas    │  │ Lexis Bill   │  │ fundacional  │  │ predictivo   │
│ (actual)     │  │ (DGII, docs, │  │ (GPT/Claude/ │  │ (cash flow,  │
│              │  │  facturas)   │  │  open)       │  │  mora)       │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

### Rol de cada pieza

1. **Modelo base (LLM fundacional)**  
   - Uso: respuestas en lenguaje natural, resúmenes, sugerencias de texto, explicaciones.  
   - No reemplaza reglas ni RAG; complementa.

2. **RAG con datos de Lexis Bill**  
   - Fuentes: normativa DGII, guías 606/607, tus propias facturas/clientes (anonimizados/agregados), FAQs fiscales RD.  
   - Ventaja: respuestas ancladas a “la realidad de nuestro país” y a tu producto. Un competidor genérico no tiene este corpus.

3. **Motor de reglas (Billing Brain actual)**  
   - Sigue siendo la fuente de verdad para: facturas sin cobrar, vencidas, concentración de cliente, clientes inactivos.  
   - Es determinista, auditable y barato. El LLM no debe reemplazarlo; debe explicarlo y actuar sobre él.

4. **Motor predictivo (nuevo)**  
   - Modelos ligeros (series temporales, clasificadores) para: flujo de caja, probabilidad de mora, sugerencia de precios.  
   - Entrenados con **tus** datos; aquí sí tiene sentido “modelo propio” pero pequeño y acotado, no un LLM completo.

5. **Agentes especializados (futuro)**  
   - Agentes por tarea: “recordatorios”, “validación pre-envío”, “explicación fiscal”.  
   - Cada uno usa orquestador + reglas + RAG + LLM según el caso.

**Por qué esto es ventaja competitiva difícil de copiar:**  
La combinación **datos DGII + datos de facturación real en RD + reglas de negocio + UX unificada** no se compra con una API. Un competidor puede tener un LLM igual; no tiene tu RAG ni tu Billing Brain ni tu distribución. La barrera está en **datos + producto**, no solo en el modelo.

---

## 3. Estrategia a nivel experto

### ¿Qué hacen los SaaS más exitosos que los demás no?

- **Tratan la IA como producto, no como feature:** La IA está en el flujo crítico (ej. “antes de enviar la factura”, “al abrir el dashboard”), no es un chat aparte.
- **Orquestan, no solo llaman al LLM:** Deciden cuándo usar regla, cuándo RAG, cuándo LLM. Lexis Bill ya tiene el embrión (Billing Brain como orquestador de reglas).
- **Miden valor de negocio:** Retención, tiempo a primera factura, reducción de errores, no solo “tokens consumidos”.
- **Acumulan datos útiles:** Cada interacción mejora RAG, feedback y futuros modelos pequeños (ej. predictivo de mora).

### ¿Dónde está la barrera: el modelo o los datos?

**En los datos y en el loop producto–IA.**  
Un modelo fundacional es commodity; tu ventaja es:
- Corpus DGII y fiscal RD estructurado.
- Patrones de facturación, cobro y mora por sector en RD.
- Integración con Blindaje RNC, reportes 606/607, flujo real del usuario.

Quien tenga el mejor **dataset de facturación dominicana + mejor producto** ganará. El modelo base puede ser el mismo para todos.

### ¿Qué debería construir Lexis Bill hoy para dominar en 3–5 años?

1. **RAG “Lexis Bill”**  
   - Índice con: normativa DGII, documentación 606/607, ejemplos de facturas (anonimizados), preguntas frecuentes.  
   - Objetivo: que cada respuesta del Copilot cite “realidad DGII y Lexis Bill”.

2. **Pipeline de datos para IA**  
   - Eventos anonimizados/agregados: tipo de factura, sector, monto, tiempo de cobro, errores evitados.  
   - Sin esto, en 3 años no tendrás con qué entrenar predictivos ni evaluar un futuro modelo propio.

3. **Billing Brain como orquestador**  
   - Que decida: “esto lo resuelvo con regla”, “esto con RAG + LLM”, “esto con modelo predictivo”.  
   - Mantener reglas donde son fuertes; usar LLM donde hace falta lenguaje y explicación.

4. **Un solo “cerebro” visible**  
   - El usuario no debe ver “reglas vs IA”. Debe ver “Lexis Bill me dijo esto”.  
   - Copilot como única interfaz de inteligencia.

5. **No entrenar un LLM propio hasta tener métricas claras**  
   - Ver sección 4.

---

## 4. Momento exacto para entrenar un modelo propio (LLM)

No usar “cuando tengamos dinero”. Usar **métricas**.

| Métrica | Umbral orientativo | Razón |
|--------|---------------------|--------|
| Usuarios activos (mensual) | >30k–50k | Base suficiente para patrones estadísticos y evaluación A/B. |
| Facturas procesadas (total) | >2M–5M | Corpus de texto y estructura para preentrenamiento o fine-tuning. |
| Consultas Copilot / mes | >100k | Señal de qué preguntas importan y qué respuestas funcionan. |
| Cobertura RAG actual | >80% preguntas resueltas sin LLM genérico | Indica que el dominio ya está bien capturado en datos. |
| Brecha medible | LLM genérico falla o es caro en >15–20% casos críticos | Justifica costo de modelo propio. |

**Nivel de automatización antes de plantearse modelo propio:**  
Que la mayoría de “inteligencia” ya esté resuelta con reglas + RAG + LLM de API. El modelo propio entra cuando **esa pila** sea el cuello de botella (coste, latencia, privacidad o calidad en nichos muy concretos).

**Error:** Entrenar un LLM propio “para tener IA propia” sin haber explotado antes RAG + reglas + LLM de terceros. Primero se domina el problema con arquitectura híbrida; luego se sustituye la pieza que realmente duele.

---

## 5. Roadmap de madurez de IA (4 fases)

### Fase 1 — Inteligencia asistida (donde está Lexis Bill hoy)

- **Qué es:** El sistema sugiere y avisa; el humano decide y ejecuta.  
- **Ejemplos:** Billing Brain: “Tienes X facturas sin cobrar”, “Cliente Y inactivo 60 días”. Blindaje RNC. Reportes en un clic.  
- **Qué cambia:** Nada que eliminar; hay que **añadir** RAG y primera integración LLM (explicaciones, resúmenes en lenguaje natural) sin quitar reglas.

### Fase 2 — Inteligencia contextual

- **Qué es:** La IA usa contexto del usuario (sus facturas, sus clientes, DGII) para personalizar mensajes y sugerencias.  
- **Ejemplos:** “Para tu tipo de clientes, suelen pagar en X días”; “Según DGII, este NCF aplica cuando…”; sugerencia de precios basada en tu historial.  
- **Qué cambia:** RAG con datos del usuario (y agregados) + orquestador que elige entre regla y RAG/LLM. El Copilot habla con “tu” contexto.

### Fase 3 — Inteligencia predictiva

- **Qué es:** El sistema anticipa y propone acciones antes de que el usuario tenga que buscarlas.  
- **Ejemplos:** “Flujo de caja en 90 días: posible bache en marzo”; “Estos 3 clientes tienen alta probabilidad de pagar tarde”; “Tu volumen sugiere subir precio en servicio Z”.  
- **Qué cambia:** Motores predictivos (series temporales, clasificadores) alimentados por datos de Lexis Bill. Siguen siendo “modelos propios” acotados, no un LLM gigante.

### Fase 4 — Plataforma autónoma

- **Qué es:** Acciones ejecutadas por el sistema con supervisión o aprobación explícita.  
- **Ejemplos:** Recordatorios automáticos por mora; borrador de factura sugerido y listo para un clic; alertas fiscales que se traducen en tareas en el flujo de trabajo.  
- **Qué cambia:** Agentes que no solo sugieren sino que disparan acciones en el producto (con confirmación donde sea necesario por riesgo legal/fiscal).

---

## 6. La gran pregunta: de herramienta a plataforma indispensable

**¿Cómo puede Lexis Bill usar IA para volverse indispensable?**

- **No:** “Un chat que responde preguntas” → eso es feature, no plataforma.  
- **Sí:** Ser el **sistema nervioso financiero** del profesional en RD:  
  - Que **evite** errores (RNC, NCF, plazos) antes de que ocurran.  
  - Que **anticipe** (cobros, flujo, mora) y proponga la siguiente acción.  
  - Que **explique** en español y en términos DGII, sin jerga.  
  - Que **automatice** lo repetitivo (recordatorios, reportes, borradores) dejando al humano solo las decisiones que importan.

La propuesta de valor ya está en la web: “Más que facturas, inteligencia fiscal.” La IA es el medio para cumplirla: **Blindaje RNC** + **Reportes en un clic** + **Movilidad** se vuelven “inteligencia que piensa por vos” cuando detrás hay orquestación (reglas + RAG + LLM + predictivos) y una sola experiencia (Copilot).

**Ventaja competitiva:** En RD, el que una “inteligencia fiscal” hable DGII, conozca 606/607 y los flujos reales de facturación y cobro, y esté en el mismo producto donde se factura, no se replica con un integrador genérico. La barrera es **datos + producto + confianza**, no el último modelo de OpenAI.

---

## Resumen ejecutivo

| Tema | Conclusión |
|------|------------|
| **Recomendación** | Arquitectura híbrida: LLM fundacional + RAG Lexis Bill + Billing Brain orquestador + motores predictivos acotados. No LLM propio aún. |
| **Riesgos** | Modelo propio prematuro (coste, distracción, modelo mediocre). Dependencia excesiva de un solo proveedor LLM (mitigar con diseño modular). |
| **Oportunidad** | Dominar “inteligencia fiscal en RD” con datos DGII + facturación real; convertirse en estándar para el profesional que no es contador. |
| **Error a evitar** | Entrenar un LLM propio antes de tener datos, uso y una pila híbrida que ya esté al límite. |
| **Ventaja competitiva** | Datos (DGII, facturación, cobros) + orquestación (reglas + RAG + LLM) + producto (Blindaje RNC, reportes, Copilot unificado). El modelo base es commodity; la combinación no. |

---

*Documento interno — Estrategia IA Lexis Bill. Revisar con producto e ingeniería; actualizar umbrales según tracción real.*
