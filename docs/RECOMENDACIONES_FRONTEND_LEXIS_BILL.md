# Recomendaciones de frontend según la filosofía Lexis Bill

**Objetivo:** Alinear el frontend con la identidad del producto: facturación fiscal para RD, diseño profesional, mobile-first, temas y sistema de diseño consistente.

---

## Filosofía Lexis Bill (resumida)

| Principio | Descripción |
|-----------|-------------|
| **Sistema de diseño** | Un solo conjunto de colores y componentes (Shadcn UI + Tailwind + variables CSS en `globals.css`). |
| **Temas** | Light, Midnight (oscuro) y Luxury; el usuario puede elegir y la app debe respetarlo. |
| **Mobile-first** | Diseño pensado primero en móvil, luego tablet y desktop. |
| **Claridad fiscal** | Mensajes y disclaimers claros (ej. “No constituye e-CF oficial”). |
| **Código mantenible** | Estilos en CSS/ Tailwind con tokens, sin colores hex repetidos en cada página. |

---

## 1. Usar el sistema de diseño (prioridad alta)

**Problema:** En **landing**, **login**, **registro**, **checkout** y otras páginas se usan colores hex fijos (`#0A192F`, `#D4AF37`, `#F9F6EE`, `#081221`, `#B8962E`) en lugar de las variables del tema.

**Impacto:**
- La landing y páginas públicas no respetan el tema (light/midnight/luxury).
- Duplicación de la “marca” en vez de un único origen de verdad.
- Cualquier cambio de paleta obliga a tocar muchos archivos.

**Recomendación:**

- **Definir (o reutilizar) tokens para la marca** en `globals.css`, por ejemplo:
  - Fondo oscuro tipo landing: algo como `--lexis-bg-deep` / `--lexis-bg-mid`.
  - Dorado/acento: ya existe `--ring`, `--secondary` (Champagne Gold); unificar con un token tipo `--lexis-gold` si quieres nombre semántico.
- **Sustituir en el frontend** todos los `#0A192F`, `#D4AF37`, etc. por:
  - Clases Tailwind que usen el `@theme` (p. ej. `bg-background`, `text-foreground`, `bg-primary`, `text-primary`, `border-border`, `ring`).
  - O clases que usen variables CSS (p. ej. `bg-[var(--lexis-bg-deep)]` si las añades).
- **Prioridad de archivos:** `app/(public)/landing/page.tsx` y `(public)/page.tsx`, luego `login`, `registro`, `checkout`. **Hecho:** variables Lexis en `globals.css` y páginas refactorizadas con tokens.

Así toda la app, incluido el frontend público, sigue la filosofía de “un diseño, varios temas”.

---

## 2. Estilos en archivos externos (CSS / módulos)

**Problema:** Algunas herramientas (p. ej. Microsoft Edge Tools) avisan cuando hay estilos inline (`style={{ ... }}`).

**Recomendación:**
- No usar `style={{}}` para maquetación o colores; reservarlo solo para valores dinámicos (p. ej. progreso, posición calculada).
- Mantener estilos en:
  - **Tailwind** (clases con design tokens),
  - **CSS modules** (`.module.css`) para páginas o bloques con mucho estilo específico,
  - **globals.css** para variables y estilos base.

Esto ya va en la línea de “código comentado y mantenible” que menciona el README.

---

## 3. Rutas y grupos de rutas

**Problema:** Según el análisis del proyecto, rutas como `/landing`, `/checkout`, `/admin`, `/contador`, `/super-admin` están fuera de los route groups `(protected)` y `(public)`.

**Recomendación:**
- Mover **landing** a `(public)` (o un solo “home” en `(public)/page.tsx` y que `/landing` redirija) para unificar layout público y protección.
- Dejar **checkout** en ruta pública pero con layout claro (sin sidebar de app).
- Asegurar que **admin**, **contador**, **super-admin** estén bajo un layout protegido y con middleware que verifique rol.
- Revisar que no haya dos “homes” (por ejemplo `(public)/page.tsx` y `landing/page.tsx` con contenido duplicado) y unificar criterio.

Así el frontend refleja bien “qué es público” y “qué es protegido”, alineado con la filosofía de seguridad del proyecto.

---

## 4. Consistencia entre páginas públicas

**Problema:** Login y registro pueden usar más el sistema de diseño (cards, inputs, botones de Shadcn) mientras la landing usa muchos hex y estilos propios.

**Recomendación:**
- Misma familia de componentes: **Button**, **Card**, **Input**, etc. de `@/components/ui` en todas las páginas públicas.
- Misma paleta: solo tokens (background, foreground, primary, border, etc.) tanto en landing como en login/registro/checkout.
- Mismo criterio de espaciado (Tailwind: `gap-*`, `p-*`, `m-*`) y tipografía (clases `font-*`, `text-*` definidas en base o en tema).

Así la “sensación” Lexis Bill (profesional, claro, fiscal) es la misma en todo el frontend.

---

## 5. Mobile-first y accesibilidad

**Recomendación:**
- Revisar que las páginas con más contenido (landing, dashboard, reportes) usen **breakpoints** de Tailwind (`sm:`, `md:`, `lg:`) de forma consistente y que los toques/objetivos sean grandes en móvil.
- Asegurar contraste suficiente (los tokens del tema ya ayudan) y que botones y enlaces tengan estados `:focus-visible` (Shadcn suele llevarlos).
- Evitar texto esencial solo en color; si algo es “dorado” o “verde”, que no sea la única forma de distinguir información importante.

Esto encaja con “diseño intuitivo” y “optimizado para dispositivos móviles” del README.

---

## 6. Resumen de acciones sugeridas

| Prioridad | Acción |
|-----------|--------|
| **Alta** | Sustituir colores hex en `landing/page.tsx` (y resto de app) por clases/tokens del sistema de diseño. |
| **Alta** | Añadir/uso de variables “marca” en `globals.css` (ej. `--lexis-gold`, `--lexis-bg-deep`) y usarlas vía Tailwind o clases. |
| **Media** | Revisar `login`, `registro`, `checkout` y reemplazar cualquier hex restante por tokens. |
| **Media** | Organizar rutas en `(public)` / `(protected)` y unificar home vs landing. |
| **Baja** | Evitar estilos inline; usar solo CSS/Tailwind/módulos. |
| **Baja** | Revisar responsive y foco en las páginas más usadas. |

Si quieres, el siguiente paso puede ser: (1) proponer los nombres exactos de variables en `globals.css` y (2) un ejemplo concreto de cómo reemplazar una sección de `landing/page.tsx` usando solo el sistema de diseño.
