# 💼 Billig DGII - Sistema de Facturación Electrónica

Sistema de facturación electrónica diseñado específicamente para el mercado de República Dominicana, cumpliendo con los requisitos de la DGII (Dirección General de Impuestos Internos).

## 🚀 Características

- ✅ **Dashboard Intuitivo**: Visualiza total facturado, facturas pendientes y clientes
- ✅ **Comprobantes Fiscales Electrónicos (e-CF)**: Soporte para tipos 31, 32, 33, 34
- ✅ **Cálculos Automáticos**: ITBIS (18%) y Retención ISR (10%)
- ✅ **Diseño Mobile-First**: Optimizado para dispositivos móviles
- ✅ **Código Comentado**: Ideal para aprender Next.js y TypeScript

## 🛠️ Tecnologías

- **Next.js 14+** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Diseño moderno y responsive
- **Shadcn UI** - Componentes de interfaz de alta calidad

## 📦 Instalación

Las dependencias ya están instaladas. Si necesitas reinstalar:

```bash
npm install
```

## 🚀 Uso

### Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

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

## 💾 Almacenamiento de Datos

Actualmente usa **localStorage** para demostración. Los datos persisten en el navegador.

> **Nota**: Para producción, necesitarás implementar un backend con base de datos y conectar con el sistema oficial de DGII.

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

## 🔧 Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run lint     # Linter ESLint
```

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
