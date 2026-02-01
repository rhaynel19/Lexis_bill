# 🔄 Estrategia de Backups — Lexis Bill

## MongoDB Atlas (Recomendado)

Si usas **MongoDB Atlas**, los backups automáticos están disponibles según tu plan:

| Plan | Backups |
|------|---------|
| **Free (M0)** | Snapshots continuos (retención limitada) |
| **Shared (M2/M5)** | Backups automáticos diarios |
| **Dedicated (M10+)** | Backups continuos, Point-in-Time Recovery |

### Configurar en Atlas

1. Ve a tu cluster → **Backup** en el menú lateral.
2. Activa **Cloud Backup** si está disponible.
3. Configura la ventana de backup (ej. 2:00 AM hora local).
4. Revisa la retención (ej. 7 días para dev, 35 días para producción).

### Restaurar desde backup

1. Atlas → Backup → selecciona el punto de restauración.
2. **Restore** → elige restaurar al cluster actual o crear uno nuevo.
3. Actualiza `MONGODB_URI` si creaste un cluster nuevo.

---

## Script de backup (npm run backup)

```bash
npm run backup
```

Guarda en `./backups/backup-YYYY-MM-DD.gz`. Configure `BACKUP_OUTPUT_DIR` en `.env` si desea otra ruta.

### Restore (probado)

```bash
# Restaurar backup del día actual
npm run restore

# Restaurar archivo específico
node scripts/restore-mongodb.js backups/backup-2026-01-31.gz
```

**IMPORTANTE:** Use un `MONGODB_URI` de staging/recovery. No restaurar sobre producción sin plan de contingencia.

---

## Export manual (mongoexport)

Para backups manuales o migración:

```bash
# Exportar toda la base
mongoexport --uri="mongodb+srv://user:pass@cluster.mongodb.net/lexis_bill" \
  --out=backup_$(date +%Y%m%d).json

# Exportar colecciones específicas
mongoexport --uri="mongodb+srv://..." --collection=users --out=users.json
mongoexport --uri="mongodb+srv://..." --collection=invoices --out=invoices.json
```

---

## Frecuencia recomendada

| Entorno | Frecuencia |
|---------|------------|
| Desarrollo | Semanal (manual) |
| Staging | Diario |
| Producción | Continuo + retención 30+ días |

---

## Checklist pre-lanzamiento

- [ ] Backups automáticos activos en Atlas
- [ ] Probar restauración al menos una vez
- [ ] Documentar proceso de recuperación
- [ ] Definir responsable de backups
