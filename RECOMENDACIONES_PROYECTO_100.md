# LexisBill — Recomendaciones generales y camino al 100%

**Objetivo:** Evaluación del estado actual y qué falta para un producto completo y listo para producción comercial.

---

## Estado actual (estimado: ~75–80%)

### ✅ Lo que ya está bien

| Área | Estado |
|------|--------|
| **Autenticación** | Login, registro, JWT en cookie HttpOnly |
| **Membresías** | Planes Free/Pro/Premium, pago manual, validación admin |
| **Panel Admin/CEO** | Pagos pendientes, estadísticas, control de acceso |
| **Facturación** | Crear facturas, NCF por usuario, límites por plan |
| **Cotizaciones** | CRUD en MongoDB, conversión a factura |
| **Clientes** | Gestión en MongoDB |
| **Gastos (606)** | Registro, categorías DGII, reporte 606 |
| **Reportes** | 606 y 607 en formato DGII, descarga con cookies |
| **Protección rutas** | Middleware protege /admin y rutas protegidas |
| **UX** | Temas, responsive, PWA, diseño LexisBill |
| **PDF** | Generación de facturas |

---

## Lo que falta para el 100%

### 🔴 Crítico (bloquea producción comercial)

#### 1. Integración PSFE / Facturación electrónica oficial
- **Estado:** Alanube y FacturaDirecta en `config.ts` están `enabled: false`
- **Impacto:** Las facturas no tienen validez electrónica ante DGII
- **Acción:** Elegir proveedor (Alanube, FacturaDirecta u otro) e integrar firma y envío a DGII

#### 2. Validación RNC real
- **Estado:** Se usa base mock; no hay consulta a DGII
- **Impacto:** Se pueden emitir facturas con RNC inválidos
- **Acción:** Integrar API DGII o servicio certificado (p. ej. DGII Web Services, si están disponibles)

#### 3. Eliminar dependencia de localStorage para auth
- **Estado:** `localStorage` guarda `user` (nombre, role, etc.) para la UI
- **Riesgo:** Si se borra, la UI puede quedar inconsistente
- **Acción:** Obtener siempre datos del usuario desde `/api/auth/me` y usar solo cookies para sesión

---

### 🟡 Importante (calidad y seguridad)

#### 4. Migrar datos restantes de localStorage a backend
- **appConfig:** Configuración de empresa (logo, datos fiscales) — parte ya se guarda en API
- **invoiceDraft, invoiceTemplates:** Borradores y plantillas — migrar a MongoDB
- **services:** Servicios predefinidos — migrar a BD
- **userDocs:** Documentos en `/documentos` — migrar a API + almacenamiento

#### 5. Formato completo 606/607
- **Estado:** Formato básico según DGII
- **Acción:** Completar campos según especificación oficial (retenciones, tipo ingreso, etc.)

#### 6. Build sin ignorar errores
- **Estado:** Posible `ignoreDuringBuilds` o `ignoreBuildErrors` en `next.config.js`
- **Acción:** Corregir errores TypeScript/ESLint y quitar excepciones

#### 7. Recuperación de contraseña
- **Estado:** Modal de recuperación que simula envío
- **Acción:** Flujo real: token por email, validación y restablecimiento

---

### 🟢 Mejoras (UX y producto)

#### 8. Pasarela de pago real
- **Estado:** Solo pagos manuales (transferencia/PayPal manual)
- **Acción:** Integrar Stripe, PayPal Checkout o similar para cobros automáticos

#### 9. Notificaciones por email
- Factura emitida
- Recordatorios 606/607
- Renovación de membresía
- Aprobación/rechazo de pago

#### 10. Panel CEO ampliado
- Gráficos (facturación mensual, usuarios por plan)
- Exportación de datos (CSV/Excel)
- Filtros por periodo

#### 11. Tests
- Unitarios para validadores (RNC, NCF)
- E2E para flujos críticos (login, factura, cotización)

#### 12. Documentación
- README actualizado con MongoDB, membresías, variables de entorno
- Guía de despliegue (Vercel + API)
- Documentación de API (Swagger/OpenAPI)

---

## Resumen por prioridad

| Prioridad | Tarea | Esfuerzo | Impacto |
|-----------|-------|----------|---------|
| P0 | Integración PSFE | Alto | Crítico |
| P0 | Validación RNC real | Medio | Crítico |
| P1 | Auth sin depender de localStorage | Bajo | Alto |
| P1 | Formato 606/607 completo | Medio | Alto |
| P1 | Recuperación de contraseña | Medio | Alto |
| P2 | Migrar localStorage restante | Medio | Medio |
| P2 | Pasarela de pago automática | Alto | Medio |
| P2 | Build sin ignore | Bajo | Medio |
| P3 | Notificaciones email | Medio | Medio |
| P3 | Tests | Alto | Medio |
| P3 | Documentación | Bajo | Medio |

---

## Roadmap sugerido (3 fases)

### Fase 1 — Estabilización (2–3 semanas)
- [ ] Obtener datos de usuario solo desde API, no localStorage
- [ ] Corregir build (quitar ignore)
- [ ] Migrar borradores y plantillas a MongoDB
- [ ] Recuperación de contraseña funcional

### Fase 2 — Fiscal y seguridad (3–4 semanas)
- [ ] Validación RNC real (DGII o proveedor)
- [ ] Formato 606/607 completo
- [ ] Evaluar e integrar proveedor PSFE (pruebas en sandbox)

### Fase 3 — Producto comercial (4–6 semanas)
- [ ] Integración PSFE en producción
- [ ] Pasarela de pago (Stripe/PayPal)
- [ ] Notificaciones por email
- [ ] Tests E2E críticos
- [ ] Documentación y guía de despliegue

---

## Conclusión

**LexisBill está en torno al 75–80%** para un SaaS de facturación en República Dominicana.

Lo más bloqueante para uso comercial formal es:
1. **PSFE** (facturación electrónica oficial)
2. **Validación RNC real**
3. **Reducir dependencia de localStorage**

Con las fases 1 y 2 completadas se podría operar en **beta con usuarios reales**. Con la fase 3 se podría ofrecer un producto listo para **producción comercial** ante DGII.
