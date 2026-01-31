# 📋 INFORME DE AUDITORÍA – LEXIS BILL

**Fecha:** 26 de Enero, 2026  
**Sistema:** Lexis Bill (SaaS de facturación DGII – República Dominicana)  
**Stack:** Next.js 16, React 19, TypeScript, Vercel, MongoDB  

---

## 1. RESUMEN EJECUTIVO

Lexis Bill es un sistema de facturación pre-electrónica orientado a profesionales independientes en República Dominicana. La auditoría identifica un producto **funcionalmente apto** para operación limitada (pruebas, early adopters), pero con **riesgos significativos** que deben resolverse antes de un lanzamiento comercial formal.

**Conclusiones principales:**
- ✅ Flujo cotización → factura → reportes funciona correctamente
- ⚠️ Cotizaciones almacenadas solo en localStorage (pérdida de datos al cambiar dispositivo/navegador)
- ⚠️ Reporte 606 tiene endpoint duplicado; el activo no valida nombre fiscal
- ⚠️ Token JWT expuesto en URLs de descarga de reportes (riesgo de seguridad)
- ⚠️ Validación RNC basada en mock/DB local, no DGII real
- ❌ Sin integración PSFE; comprobantes no tienen validez electrónica oficial

**Estado general:** **CONDICIONADO** – Apto para fase beta cerrada con usuarios conocidos; no apto para facturación electrónica oficial ni escalamiento comercial sin correcciones.

---

## 2. ESTADO GENERAL DEL SISTEMA

| Área | Estado | Observación |
|------|--------|-------------|
| **Funcional** | Apto | Flujos principales operativos |
| **Fiscal DGII** | Condicionado | Lógica correcta, pero sin PSFE; reportes en formato simplificado |
| **Seguridad** | Condicionado | Auth JWT presente; token en URL; validación en cliente |
| **UX/UI** | Apto | Responsive; temas; interfaz coherente |
| **Técnico** | Condicionado | Ignore build errors; dependencias no actualizadas |
| **Escalabilidad** | No evaluado | Arquitectura actual sin pruebas de carga |

---

## 3. HALLAZGOS CRÍTICOS 🔴

### 3.1 Cotizaciones en localStorage
- **Ubicación:** `app/(protected)/cotizaciones/page.tsx`
- **Problema:** Las cotizaciones se guardan exclusivamente en `localStorage`. No hay persistencia en backend.
- **Impacto:** Pérdida total al limpiar caché, cambiar navegador o dispositivo.
- **Recomendación:** Migrar a colección MongoDB/API y sincronizar con backend.

### 3.2 Token JWT en URLs de reportes
- **Ubicación:** `app/(protected)/reportes/page.tsx` (líneas 52-53, 58-59)
- **Problema:** El token se pasa como query param: `?token=${token}`.
- **Impacto:** El token puede quedar en historial, logs, referrers y proxies.
- **Recomendación:** Usar header `Authorization` o cookies httpOnly para descargas.

### 3.3 Reporte 606: endpoint duplicado y falta de validación fiscal
- **Ubicación:** `api/index.js` – existen dos definiciones de `/api/reports/606`
- **Problema:** La primera (líneas 586-604) exige `confirmedFiscalName`; la segunda (681-710) no. Express usa la última definición, por lo que el 606 activo no valida nombre fiscal.
- **Impacto:** Usuarios sin identidad fiscal confirmada pueden generar reportes 606.
- **Recomendación:** Unificar en un solo endpoint y añadir validación de nombre fiscal.

### 3.4 Validación RNC no conectada a DGII
- **Ubicación:** `api/index.js` (`/api/rnc/:number`, `/api/validate-rnc`), `lib/rnc-validator.ts`
- **Problema:** Uso de base mock con RNCs de prueba. No hay consulta a DGII ni a servicio certificado.
- **Impacto:** Posible emisión de facturas con RNC inexistentes o inválidos.
- **Recomendación:** Integrar API DGII o servicio intermedio certificado antes de producción.

### 3.5 Sin facturación electrónica (PSFE)
- **Ubicación:** `lib/config.ts`, API
- **Problema:** Alanube y FacturaDirecta están `enabled: false`. No hay firma electrónica ni envío a DGII.
- **Impacto:** Los comprobantes no tienen validez fiscal electrónica oficial.
- **Recomendación:** Planificar integración PSFE según roadmap fiscal dominicano.

### 3.6 Protección de rutas basada solo en cliente
- **Ubicación:** `app/(protected)/layout.tsx`
- **Problema:** La protección se hace con `useEffect` + `localStorage`; no hay middleware de Next.js.
- **Impacto:** Rutas protegidas son accesibles si se omite JavaScript; posible flash de contenido.
- **Recomendación:** Implementar middleware de autenticación en Next.js.

---

## 4. HALLAZGOS MEDIOS 🟡

### 4.1 Formato de reportes 606/607 simplificado
- **Problema:** El formato TXT es básico. DGII exige campos adicionales según tipo de comprobante.
- **Ejemplo 607:** Falta tipo de ingreso completo, retenciones, NCF modificado, etc.
- **Recomendación:** Revisar especificación oficial DGII y ampliar campos.

### 4.2 Conversión cotización → factura pierde tipo de NCF
- **Ubicación:** `app/(protected)/cotizaciones/page.tsx` (handleConvertToInvoice)
- **Problema:** Se fuerza `type: "32"` (Consumo) en lugar de inferir según RNC del cliente.
- **Recomendación:** Replicar lógica de sugerencia de NCF de nueva-factura (RNC 9 dígitos → B01/E31, etc.).

### 4.3 Edición de cotizaciones sin historial
- **Problema:** Al editar una cotización, se sobrescribe en el array de `localStorage` sin versionado.
- **Impacto:** No hay trazabilidad de cambios.
- **Recomendación:** Al migrar a backend, añadir versiones o historial de ediciones.

### 4.4 Rutas fuera de route groups
- **Problema:** `/admin`, `/checkout`, `/contador`, `/documentos`, `/gastos`, `/landing`, `/super-admin` están fuera de `(protected)` y `(public)`.
- **Impacto:** Layout y protección inconsistentes; `/gastos` está en `(protected)` pero otras rutas similares no.
- **Recomendación:** Unificar estructura de rutas y protección.

### 4.5 Build: ignoreDuringBuilds / ignoreBuildErrors
- **Ubicación:** `next.config.js`
- **Problema:** Errores de TypeScript y ESLint se ignoran en build.
- **Impacto:** Errores ocultos que pueden llegar a producción.
- **Recomendación:** Corregir errores y quitar estas opciones.

### 4.6 JWT_SECRET con valor por defecto
- **Ubicación:** `api/index.js` (línea 167)
- **Problema:** Fallback `'secret_key_lexis_placeholder'` si no hay variable de entorno.
- **Impacto:** Tokens fácilmente falsificables en despliegues mal configurados.
- **Recomendación:** Fallar el arranque si `JWT_SECRET` no está definido.

### 4.7 Botón "Facturar" oculto en móvil (Cotizaciones)
- **Ubicación:** `app/(protected)/cotizaciones/page.tsx` (línea 165)
- **Problema:** `hidden md:flex` oculta el botón "Facturar" en pantallas pequeñas.
- **Impacto:** Usuario móvil no puede convertir cotización a factura desde la lista.
- **Recomendación:** Mostrar botón en móvil (icono o texto acortado).

---

## 5. BUENAS PRÁCTICAS DETECTADAS 🟢

- **Validación de RNC:** Algoritmo de dígito verificador implementado correctamente (9 y 11 dígitos).
- **NCF por usuario:** Secuencias NCF por usuario en MongoDB con transacciones.
- **Nombre fiscal:** Bloqueo de facturación hasta confirmar nombre fiscal.
- **Separación 606/607:** Ventas (invoices) alimentan 607; gastos (expenses) alimentan 606.
- **Categorías de gastos DGII:** Códigos 01-11 alineados con clasificación oficial.
- **Responsive:** Layout con sidebar colapsable, bottom nav móvil y FAB.
- **Temas:** Light, Midnight, Luxury, System con variables CSS coherentes.
- **DocumentViewer:** Modal reutilizable para cotizaciones y facturas.
- **PDF:** Generación cliente con jsPDF, formato limpio y totales correctos.
- **WhatsApp:** Deep links sin API; mensajes predefinidos y profesionales.

---

## 6. RIESGOS FISCALES Y TÉCNICOS

### Riesgos fiscales
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| RNC inválido en factura | Media | Alto | Integrar validación DGII real |
| Reporte 607 incompleto | Media | Medio | Revisar y ampliar formato según DGII |
| Reporte 606 sin validación fiscal | Alta | Medio | Añadir validación de nombre fiscal |
| Sin PSFE | Certeza | Alto | Planificar integración PSFE |

### Riesgos técnicos
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Pérdida de cotizaciones | Alta | Medio | Persistir en backend |
| Token en URL | Media | Alto | Usar headers o cookies |
| Rutas desprotegidas | Media | Medio | Middleware + route groups |
| Build inestable | Media | Medio | Corregir errores y quitar ignore |

---

## 7. RECOMENDACIONES PRIORITARIAS (ORDEN)

1. **Migrar cotizaciones a backend** – Crear API y colección; eliminar dependencia de localStorage.
2. **Eliminar token de URLs** – Usar Authorization header o cookies para descargas de reportes.
3. **Unificar endpoint 606** – Un solo handler con validación de nombre fiscal.
4. **Implementar middleware de auth** – Proteger rutas en servidor, no solo en cliente.
5. **Integrar validación RNC real** – DGII o servicio certificado.
6. **Mostrar botón "Facturar" en móvil** – En la tabla de cotizaciones.
7. **Corregir errores de build** – Quitar ignoreDuringBuilds e ignoreBuildErrors.
8. **Revisar formato 606/607** – Completar campos según especificación DGII.
9. **Fallar si falta JWT_SECRET** – No usar valor por defecto inseguro.
10. **Planificar PSFE** – Roadmap para facturación electrónica oficial.

---

## 8. ROADMAP SUGERIDO

### 30 días (Estabilización)
- Migrar cotizaciones a MongoDB
- Corregir token en URLs de reportes
- Unificar y corregir endpoint 606
- Implementar middleware de auth
- Corregir build (TypeScript/ESLint)
- Mostrar botón Facturar en móvil

### 60 días (Fiscal y seguridad)
- Integrar validación RNC (DGII o proveedor)
- Revisar y completar formato 606/607
- Eliminar JWT fallback inseguro
- Auditar y proteger rutas (/admin, /super-admin, etc.)
- Pruebas de carga básicas

### 90 días (Producto comercial)
- Evaluación de integradores PSFE (Alanube, FacturaDirecta, etc.)
- POC de facturación electrónica
- Documentación de cumplimiento DGII
- Plan de backup y recuperación
- Monitoring y alertas

---

## 9. CONCLUSIÓN FINAL

Lexis Bill tiene una base sólida para un SaaS de facturación en República Dominicana: flujos claros, UX orientada a no contadores, buenas prácticas en NCF y separación 606/607. Sin embargo, **no está listo para uso comercial formal** por:

1. Cotizaciones solo en localStorage  
2. Token en URLs  
3. Validación RNC simulada  
4. Ausencia de PSFE/facturación electrónica  
5. Protección de rutas limitada al cliente  

**Nivel producto:** **Beta privada** – Apto para pruebas con early adopters que acepten limitaciones conocidas. Con la ejecución del roadmap de 30–60 días, el sistema puede avanzar a **producción limitada** y prepararse para facturación electrónica en 90 días.

---

**Preparado por:** Auditoría técnica Lexis Bill  
**Versión:** 1.0  
**Confidencial**
