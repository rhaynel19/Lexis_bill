# Membresías + Panel CEO — Guía rápida

## Estado
✅ Sistema implementado y compilando correctamente.

## Crear primer administrador
```bash
node scripts/promote-admin.js tu-email@ejemplo.com
```

## Variables de entorno (.env)
```env
# Datos para recibir pagos manuales
LEXISBILL_BANK_NAME=Banco Popular Dominicano
LEXISBILL_BANK_ACCOUNT=XXX-XXXXXX-X
LEXISBILL_PAYPAL_EMAIL=pagos@lexisbill.com
```

## Rutas
- `/admin` — Pagos pendientes (aprobar/rechazar)
- `/admin/dashboard` — Estadísticas CEO

## Flujo usuario
1. Configuración → Membresía
2. Elige plan (Pro/Premium) y método (Transferencia/PayPal)
3. Hace el pago externamente
4. Clic en "He realizado el pago"
5. Admin aprueba en `/admin`

## Planes
| Plan    | Precio  | Límite facturas |
|---------|---------|-----------------|
| Free    | RD$ 0   | 5/mes           |
| Pro     | RD$ 950 | Ilimitado       |
| Premium | RD$ 2,450 | Ilimitado     |
