# Probar Lexis Bill con datos reales

Sí, puedes probar el producto con datos reales. El backend usa MongoDB y las pantallas consumen la API; no hay modo "demo" separado: lo que crees son datos reales en tu base.

---

## Requisitos

1. **MongoDB**  
   - Local: [MongoDB Community](https://www.mongodb.com/try/download/community) o Docker.  
   - O **MongoDB Atlas** (gratis): crea un cluster, obtén la URI de conexión.

2. **Variables de entorno**  
   En `.env.local` (o `.env`) en la raíz del proyecto:

   ```env
   MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/lexis_bill
   JWT_SECRET=tu_secreto_de_al_menos_32_caracteres_aleatorios
   PORT=3001
   CORS_ORIGIN=http://localhost:3000
   NEXT_PUBLIC_API_URL=http://localhost:3001/api
   ```

   Si usas Atlas: en Network Access añade tu IP (o `0.0.0.0/0` solo para pruebas).

3. **Next.js proxy al backend**  
   En `next.config.js` debe estar el rewrite de `/api` al backend (puerto 3001). Ya está configurado en el proyecto.

---

## Cómo probar paso a paso

1. **Arrancar backend y frontend**
   ```bash
   npm run dev:all
   ```
   - Frontend: http://localhost:3000  
   - Backend: http://localhost:3001  

2. **Registro / Login**
   - Ve a http://localhost:3000/registro y crea una cuenta (email, contraseña, nombre, RNC, profesión, plan).  
   - O inicia sesión en http://localhost:3000/login si ya tienes usuario.

3. **Configuración inicial**
   - **Identidad fiscal**: si te pide confirmar nombre fiscal, acéptalo.  
   - **NCF (Comprobantes fiscales)**: en **Configuración** → sección NCF, agrega al menos un rango (tipo B01 o E31, número inicial/final, fecha de vencimiento). Puedes usar rangos de prueba si no tienes aún los de DGII.

4. **Datos reales**
   - **Clientes**: en Clientes, agrega uno o más (RNC, nombre, teléfono). Opcional: importar CSV.  
   - **Nueva factura**: crea una factura eligiendo cliente, tipo de NCF, ítems, montos. Descarga el PDF.  
   - **Gastos (606)**: en Gastos, registra un gasto (suplidor, RNC, NCF, monto, ITBIS, categoría). Prueba subir una imagen de tirilla o factura para QR/OCR.  
   - **Cotizaciones**: crea una cotización y, si quieres, conviértela en factura.  
   - **Reportes**: genera 606/607 para el mes actual y descarga/valida.

5. **Dashboard**
   - Verás ingresos del mes, facturas pendientes, alertas NCF y del asistente según los datos que hayas creado.

---

## Separar pruebas de producción

- **Misma app, otra base de datos**: crea otro cluster en Atlas (o otra base local) y usa un `MONGODB_URI` distinto para "pruebas". Así los datos de prueba no mezclan con producción.  
- **Mismo MongoDB, otra base**: por ejemplo `lexis_bill_test` en la misma URI cambiando el path o el `dbName` si tu backend lo permite.

---

## Resumen

| Pregunta | Respuesta |
|----------|-----------|
| ¿Se puede probar con datos reales? | **Sí.** Todo lo que guardas (usuarios, clientes, facturas, gastos, NCF) es real en tu MongoDB. |
| ¿Necesito APIs de pago (OpenAI, etc.)? | No. La app funciona sin ellas (mocks/OCR local/tirilla). |
| ¿Qué necesito sí o sí? | MongoDB, `JWT_SECRET`, `MONGODB_URI`, y backend + frontend levantados. |

---

## Recomendaciones UX para seguir mejorando

Prioridad **alta** (rápido impacto):

1. **Loading en todas las acciones** – Botones con "Guardando...", "Enviando..." y deshabilitados mientras dura la petición (facturas, clientes, gastos, reportes).
2. **Toast de éxito** – Tras guardar/enviar: mensaje breve 2–3 s ("Factura guardada", "Cliente agregado").
3. **Reintentar en errores** – Si falla la carga de clientes, facturas o gastos: mensaje claro + botón "Reintentar".
4. **Labels y placeholders** – Cada input con label visible y placeholder de ejemplo (RNC, email, montos).

Prioridad **media**:

5. **Skeletons en listas** – Mientras cargan clientes/facturas/cotizaciones, mostrar esqueletos en lugar de spinner genérico.
6. **Onboarding** – Asegurar que el OnboardingWizard se muestre la primera vez y explique: "Aquí creas facturas", "Aquí ves reportes 606/607".
7. **Tooltips en iconos** – En tablas: "Editar", "Eliminar", "Enviar por WhatsApp" al pasar el mouse o en móvil (long press si aplica).
8. **Ayuda contextual** – En NCF, tipo de comprobante, categoría 606: ícono "¿Qué es?" con una línea de explicación.

Prioridad **mantenimiento**:

9. **Borrador automático** – En Nueva factura: guardar borrador cada X segundos (localStorage o API) para no perder datos si se cierra la pestaña.
10. **Breadcrumbs** – En flujos largos: Inicio > Facturación > Nueva factura.

Más detalle en `docs/MEJORAS_FACILIDAD_USUARIO.md`.
