# Recomendaciones para mejorar la facilidad del usuario (Lexis Bill)

Objetivo: que cualquier usuario (móvil, tablet, PC) pueda usar la plataforma con **menos fricción**, **menos dudas** y **recuperarse mejor** de errores.

---

## 1. Feedback inmediato (prioridad alta)

| Qué hacer | Dónde | Beneficio |
|-----------|--------|-----------|
| **Estados de carga** | Login, registro, envío de factura, reportes, cualquier acción que tarde >0.5 s | El usuario sabe que la app está trabajando; evita doble clic y abandono. |
| **Skeleton o spinner** | Listas (clientes, facturas, cotizaciones) mientras cargan | Sensación de velocidad; no pantalla en blanco. |
| **Mensaje de éxito breve** | Después de guardar, enviar, registrar (toast o banner 2–3 s) | Confirma que la acción se completó. |
| **Botón deshabilitado + texto** | En submit: "Entrando...", "Guardando...", "Enviando..." | Refuerza que no debe volver a pulsar. |

**Ya tienes:** `isLoading` en login y registro. Extender el mismo patrón a todas las acciones asíncronas (facturas, reportes, configuración).

---

## 2. Formularios más fáciles

| Qué hacer | Ejemplo | Beneficio |
|-----------|---------|-----------|
| **Labels visibles y asociados** | Cada input con `<label htmlFor="...">` y `id` en el input | Accesibilidad y clic en el label enfoca el campo. |
| **Placeholders que guían** | "Ej: 1-31-12345-6" en RNC, "ejemplo@correo.com" en email | Menos errores de formato. |
| **Validación en tiempo real** | RNC: ya validas al escribir; extender a email, contraseña (longitud, caracteres) | El usuario corrige al instante. |
| **Mensajes de error en español y cercanos** | "Correo o contraseña incorrectos" (ya lo tienes); evitar "Invalid credentials" | Menos frustración. |
| **Un error a la vez** | Mostrar el primer error bloqueante o resumir en la parte superior | No abrumar con una lista larga. |

**Registro:** La validación de RNC al escribir es un buen ejemplo; replicar esa claridad (✓ válido / ✗ inválido) en otros campos críticos.

---

## 3. Navegación y orientación

| Qué hacer | Dónde | Beneficio |
|-----------|--------|-----------|
| **Título de página claro** | Cada ruta con `<title>` y/o `<h1>` que diga "Nueva factura", "Clientes", "Reportes" | El usuario sabe en qué pantalla está. |
| **Breadcrumbs** | En flujos largos: Inicio > Facturación > Nueva factura | Fácil volver atrás o entender el contexto. |
| **Enlace "Volver"** | En páginas de detalle o formularios largos | Salida clara sin usar solo el navegador. |
| **Menú móvil** | Ya tienes Sheet en landing; en app protegida asegurar que todas las secciones estén en el menú móvil | Misma experiencia en celular que en desktop. |

---

## 4. Accesibilidad (sin perder calidad visual)

| Qué hacer | Ejemplo | Beneficio |
|-----------|---------|-----------|
| **Atributos `aria-`** | `aria-label` en iconos sin texto (menú, cerrar, buscar), `aria-live` para mensajes de error/éxito | Lectores de pantalla y usuarios con teclado. |
| **`alt` en imágenes** | Logo, ilustraciones, avatares con descripción breve | Imágenes con sentido para quien no ve. |
| **Contraste** | Texto sobre fondo: ratio ≥4.5:1 (ya usas dorado sobre azul oscuro; revisar grises en textos secundarios) | Legibilidad en pantallas malas o con sol. |
| **Focus visible** | No quitar `outline` sin reemplazar por `ring` o borde al hacer tab | Navegación solo con teclado. |

**Landing y páginas públicas:** Añadir `aria-label` al menú hamburguesa ("Abrir menú") y a los botones "Entrar" / "Probar gratis" si no llevan texto único.

---

## 5. Primera vez y onboarding

| Qué hacer | Dónde | Beneficio |
|-----------|--------|-----------|
| **Usar OnboardingWizard** | Tras el primer login o al entrar al dashboard por primera vez | Guía corta: "Aquí creas facturas", "Aquí ves reportes", etc. |
| **Tooltips en iconos** | En dashboard y listas: iconos de acción (editar, eliminar, enviar) con tooltip ("Editar", "Enviar por WhatsApp") | Menos clics a ciegas. |
| **Ayuda contextual** | En campos fiscales (NCF, tipo de comprobante): enlace o ícono "¿Qué es?" que abra un texto breve | Reduce dudas sin salir de la pantalla. |

Ya tienes `OnboardingWizard` y `contextual-help`; priorizar su uso en las pantallas más usadas (dashboard, nueva factura, reportes).

---

## 6. Recuperación de errores

| Qué hacer | Ejemplo | Beneficio |
|-----------|---------|-----------|
| **Botón "Reintentar"** | Si falla la carga de clientes o facturas: mensaje + botón "Reintentar" | No dejar al usuario bloqueado. |
| **Guardado automático o borrador** | En nueva factura larga: guardar borrador en `localStorage` o backend cada X segundos | No perder datos si se cierra la pestaña o hay corte de red. |
| **Mensaje claro cuando no hay datos** | "Aún no tienes clientes. Agrega el primero" + botón "Agregar cliente" | Guía la siguiente acción. |

---

## 7. Lenguaje y tono

| Qué hacer | Ejemplo | Beneficio |
|-----------|---------|-----------|
| **Todo en español** | Evitar "Submit", "Loading", "Error" en UI; usar "Enviar", "Cargando", "Error" (o mensaje concreto) | Consistencia y confianza en RD. |
| **Mensajes que explican el siguiente paso** | En vez de "Error 500": "No pudimos guardar. Revisa tu conexión e intenta de nuevo." | El usuario sabe qué hacer. |
| **Términos fiscales con breve explicación** | NCF, e-CF, 606, 607: una línea debajo o en tooltip | Profesionales no contadores entienden sin salir de la app. |

---

## 8. Resumen de prioridades

1. **Corto plazo (rápido impacto)**  
   - Loading en todas las acciones asíncronas.  
   - Mensajes de éxito con toast tras guardar/enviar.  
   - `aria-label` en menú y botones de icono en landing y app.  
   - Labels y placeholders en formularios clave (login, registro, nueva factura).

2. **Mediano plazo**  
   - Skeletons en listas (clientes, facturas).  
   - Onboarding al primer uso del dashboard.  
   - Tooltips en iconos de acción.  
   - Botón "Reintentar" en pantallas que cargan datos.

3. **Mantenimiento**  
   - Revisar contraste (grises, textos secundarios).  
   - Borrador o guardado automático en formularios largos.  
   - Breadcrumbs en flujos de varias pantallas.

Con esto la app gana en **claridad**, **feedback** y **recuperación ante errores**, sin cambiar el diseño actual; solo añadiendo comportamiento y textos que mejoran la facilidad del usuario en todos los dispositivos.

---

## 9. Migración de clientes (planilla)

**Implementado:** En **Clientes** el usuario puede subir su planilla de clientes (CSV o JSON) para migrar sin copiar a mano.

| Qué hace | Dónde | Beneficio |
|----------|--------|-----------|
| **Subir planilla** | Clientes → botón "Subir planilla / Migrar" | Importar muchos clientes de una vez (RNC, nombre, teléfono, email, notas). |
| **Plantilla CSV** | Descargar plantilla en la misma pantalla | Formato correcto (columnas rnc, name, phone, email, notes). |
| **Excel** | Instrucciones en la UI | "Si tienes Excel, expórtalo como CSV (delimitado por comas)" y súbelo. |
| **Estado vacío** | Si no hay clientes, se muestra migración por defecto + CTA "¿Tienes una planilla?" | El usuario descubre la opción al entrar por primera vez. |

**Recomendación:** Mantener CSV y JSON; no añadir .xlsx nativo para evitar dependencias. La opción "Exportar como CSV" desde Excel es suficiente y evita problemas de codificación.
