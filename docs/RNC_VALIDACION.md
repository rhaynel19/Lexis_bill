# Validación RNC / Cédula — ¿Integramos la API de la DGII?

## Respuesta corta

**No existe una API pública oficial de la DGII** para consultar RNC/Cédula en tiempo real. La DGII ofrece consulta web y descarga de listados .TXT, pero no un servicio REST para integración.

## Qué hace Lexis Bill

1. **Validación local (siempre)**  
   En el backend se valida el **formato** del RNC/Cédula (9 dígitos RNC, 11 dígitos cédula, dígito verificador). Eso no consulta a nadie.

2. **Consulta externa opcional**  
   Si en el servidor defines la variable **`DGII_RNC_API_URL`**, el backend hace una petición GET a esa URL con el RNC y usa la respuesta para mostrar **nombre/razón social** (y opcionalmente estado).  
   - Ese endpoint **no es de la DGII**; es de un **proveedor externo** que sí usa datos de la DGII (por ejemplo MegaPlus: `https://rnc.megaplus.com.do/api/consulta`).  
   - Si no defines `DGII_RNC_API_URL`, se usa la base **mock** incluida en el proyecto.

3. **Front**  
   La pantalla de facturación (y registro, etc.) llama a **`/api/rnc/:numero`**. Ese endpoint hace la validación local y, si está configurado, la consulta externa; así el usuario ve el nombre del contribuyente cuando el RNC es válido.

## Cómo activar consulta “real” (nombre desde datos tipo DGII)

- Contrata o usa un **servicio que exponga una API de consulta RNC** (ej. MegaPlus u otro).  
- En el servidor (`.env`):  
  `DGII_RNC_API_URL=https://url-del-servicio/consulta`  
  (la URL debe aceptar algo como `?rnc=131888444` y devolver JSON con al menos `razonSocial` o `name` o `nombre`).  
- Reinicia el API. A partir de ahí, las consultas desde la app usarán ese servicio en lugar del mock.

**Resumen:** No integramos “la API de la DGII” porque no hay una pública para esto. Sí integramos **soporte para cualquier API externa** vía `DGII_RNC_API_URL` (por ejemplo proveedores que consultan datos DGII).
