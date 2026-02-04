# 💼 Lexis Bill — Sistema de Facturación DGII

Sistema de facturación para República Dominicana: facturas, cotizaciones, reportes 606/607 DGII, clientes, membresías y panel CEO.

## 🚀 Características

- **Dashboard**: Total facturado, facturas pendientes, clientes
- **Facturas y NCF**: Tipos B01/B02/E31/E32, límites por plan
- **Cotizaciones**: CRUD y conversión a factura
- **Reportes 606/607**: Formato DGII con retenciones y forma de pago
- **Membresías**: Planes Free/Pro/Premium, pago manual (transferencia/PayPal)
- **Panel Admin/CEO**: Estadísticas, gráficos, export CSV, partners
- **Auth**: Login, registro, recuperación de contraseña, JWT en cookie HttpOnly
- **Validación RNC**: API externa configurable (`DGII_RNC_API_URL`) o mock

## 🛠️ Tecnologías

- **Next.js 16** (App Router), **TypeScript**, **Tailwind**, **Shadcn UI**
- **API Express** (Node), **MongoDB** (Mongoose)
- **Recharts** (gráficos CEO), **Vitest** (unit), **Playwright** (E2E)

## 📦 Instalación

```bash
npm install
```

Copia `env_example` a `.env` y configura al menos:

- `MONGODB_URI` — conexión MongoDB
- `JWT_SECRET` — mínimo 32 caracteres
- `CORS_ORIGIN` — en dev: `http://localhost:3000`
- `NEXT_PUBLIC_API_URL` — en dev: `http://localhost:3001/api`

## 🚀 Uso

### Desarrollo (front + API)

```bash
npm run dev:all
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:3001](http://localhost:3001) (proxy desde `/api` en dev)

Solo frontend: `npm run dev`. Solo API: `npm run dev:backend`.

### Crear una factura de prueba

1. Haz clic en **"➕ Nueva Factura"**
2. Selecciona el tipo de comprobante (e-CF)
3. Ingresa los datos del cliente (RNC/Cédula)
4. Agrega ítems (descripción, cantidad, precio)
5. Observa los cálculos automáticos de impuestos
6. Guarda la factura

## 📊 Tipos de Comprobantes Fiscales

| Código | Descripción | Retención ISR |
|--------|-------------|---------------|
| 31 | Factura de Crédito Fiscal | ✅ 10% |
| 32 | Factura de Consumo | ❌ No |
| 33 | Nota de Débito | ❌ No |
| 34 | Nota de Crédito | ❌ No |

## 🧮 Cálculos de Impuestos

### ITBIS (18%)
Impuesto sobre Transferencias de Bienes Industrializados y Servicios
```
ITBIS = Subtotal × 18%
```

### Retención ISR (10%)
Solo para Factura de Crédito Fiscal (Tipo 31) - Honorarios Profesionales
```
Retención ISR = Subtotal × 10%
```

### Total Final
```
TOTAL = Subtotal + ITBIS - Retención ISR
```

## 📱 Diseño Responsive

La aplicación se adapta automáticamente a:
- 📱 Móviles (375px+)
- 📱 Tablets (768px+)
- 💻 Desktop (1024px+)

## 💾 Base de datos y API

- **MongoDB**: Usuarios, facturas, cotizaciones, clientes, gastos (606), membresías, NCF, borradores y plantillas.
- **API** (`api/index.js`): Auth, facturas, cotizaciones, reportes 606/607, admin, webhooks. Ver `env_example` para variables.
- **Membresías**: Planes Free/Pro/Premium; pagos manuales (transferencia/PayPal). Ver `MEMBRESIAS_SETUP.md`.

## 📂 Estructura del Proyecto

```
web_billig_dgii/
├── app/
│   ├── layout.tsx              # Layout principal
│   ├── page.tsx                # Dashboard
│   ├── globals.css             # Estilos globales
│   └── nueva-factura/
│       └── page.tsx            # Formulario de factura
├── components/
│   └── ui/                     # Componentes Shadcn UI
└── lib/
    └── utils.ts                # Utilidades
```

## 🎓 Aprendizaje

El código está completamente comentado en español para facilitar el aprendizaje de:
- Next.js App Router
- TypeScript
- React Hooks (useState, useEffect)
- Tailwind CSS
- Componentes reutilizables

## 🔧 Scripts

```bash
npm run dev        # Solo frontend
npm run dev:backend # Solo API
npm run dev:all     # Frontend + API (recomendado en dev)
npm run build      # Build Next.js
npm run start      # Servidor de producción (Next)
npm run test       # Tests unitarios (Vitest)
npm run test:e2e   # Tests E2E (Playwright; requiere app + API corriendo)
npm run promote-admin  # Promover usuario a admin (ver script)
```

## 📄 Documentación

- **Despliegue:** [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) — Vercel + API + MongoDB
- **Recuperación de contraseña:** [docs/RECUPERACION_CONTRASENA.md](docs/RECUPERACION_CONTRASENA.md)
- **Validación RNC:** [docs/RNC_VALIDACION.md](docs/RNC_VALIDACION.md)
- **Formato 606/607:** [docs/FORMATO_606_607_DGII.md](docs/FORMATO_606_607_DGII.md)

## 📝 Próximos Pasos

Para convertir esto en una aplicación de producción:

1. **Backend**: Crear API REST (Node.js/Express)
2. **Base de Datos**: PostgreSQL o MongoDB
3. **Autenticación**: Sistema de login/registro
4. **Integración DGII**: Conectar con API oficial
5. **PDF**: Exportar facturas a PDF
6. **Email**: Envío automático de facturas

## 📄 Licencia

Este proyecto es de código abierto para fines educativos.

## 👨‍💻 Autor

Creado como ejemplo de aplicación de facturación electrónica para República Dominicana.

---

**¡Listo para facturar! 🎉**
