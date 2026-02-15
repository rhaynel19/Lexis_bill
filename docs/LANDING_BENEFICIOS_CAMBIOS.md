# Cambios en la sección "Más que facturas, inteligencia fiscal"

## Qué se cambió (y por qué)

### Subtítulo
- **Antes:** "Mientras otros sistemas te confunden con términos extranjeros, Lexis Bill está construido desde cero pensando en la DGII y la realidad de nuestro país."
- **Ahora:** "Pensado para la DGII y la realidad dominicana. Sin términos confusos: facturación, reportes y cobros en un solo lugar."
- **Motivo:** Mensaje más corto y directo; "facturación, reportes y cobros" refleja lo que hace el producto.

### De 3 a 4 bloques
Se pasó de 3 columnas a 4 para incluir el **Copilot / Billing Brain** y alinear el copy con las funciones reales.

| Bloque | Antes | Ahora |
|--------|--------|--------|
| 1 | Blindaje RNC | **Blindaje RNC y NCF** — Validación con la DGII antes de emitir. RNC correctos y NCF válidos para que ningún documento quede mal. |
| 2 | Reportes en un Clic / Cumplimiento Silencioso | **606 y 607 listos** — Reportes de gastos y ventas en formato DGII. Descarga en un clic para tu contador o presentación. |
| 3 | *(no existía)* | **Copilot fiscal** — El dashboard te avisa: facturas sin cobrar, clientes inactivos y qué hacer siguiente. Sin ser contador. |
| 4 | Movilidad Elite | **Donde sea** — Factura desde el celular o la oficina. Misma experiencia y mismo control en cualquier dispositivo. |

### Detalle por cambio

- **RNC + NCF:** El producto valida RNC y asigna NCF correctos; el copy ahora lo dice explícitamente.
- **606 y 607:** Se nombran los reportes DGII (gastos y ventas) en vez de "TXT" genérico; mejor para SEO y claridad.
- **Copilot fiscal:** Refleja el Billing Brain + Copilot: avisos proactivos (facturas sin cobrar, clientes inactivos) y "qué hacer siguiente" para no contadores.
- **Donde sea:** Mantiene la idea de movilidad sin la referencia a "Anacaona" (más universal y breve).

### Archivos tocados
- `app/(public)/page.tsx` — Landing principal.
- `app/(public)/landing/page.tsx` — Landing alternativa.

### Grid
- En desktop: `lg:grid-cols-4` (4 columnas).
- En tablet: `md:grid-cols-2` (2x2).
- En móvil: 1 columna.

---

## Alternativas si querés seguir iterando

- **Copilot:** Probar "Tu copilot fiscal" o "Inteligencia que te guía" si querés más foco en IA.
- **606/607:** Si querés enfatizar al contador: "Tu contador recibe los 606 y 607 listos para presentar."
- **Headline:** El titular "Más que facturas, inteligencia fiscal" se mantuvo; si en el futuro sumás más IA, se podría probar "Facturas con inteligencia fiscal" o similar.
