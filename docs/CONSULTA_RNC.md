# Consulta de RNC en Lexis Bill

Lexis Bill permite consultar el **RNC** (Registro Nacional del Contribuyente) o **cédula** para autocompletar el nombre del cliente al crear facturas.

## Comportamiento en la app

- En **Nueva factura**, al ingresar 9 u 11 dígitos en el campo RNC/Cédula se dispara una consulta (con debounce).
- Si se encuentra el contribuyente en la base local o en la API externa, el campo **Nombre del cliente** se completa automáticamente.
- Si **no** se encuentra, el RNC se considera válido y la app pide al usuario que **escriba el nombre del cliente**. Al guardar la factura o el cliente, ese RNC + nombre se guarda en la base de datos; la próxima vez que alguien use ese RNC, el nombre se traerá automáticamente.
- También puedes usar el botón **Buscar** para forzar la consulta.

## Origen de los datos

El backend resuelve el nombre en este orden:

1. **Base local (MongoDB)**  
   Colección `RncContribuyente`: listado DGII importado, caché de API externa o **nombres ingresados por usuarios** (al guardar factura o cliente).

2. **API externa (opcional)**  
   Si está definida la variable `DGII_RNC_API_URL`, se consulta ese servicio y, si responde, se guarda en la base local para futuras consultas.

3. **No encontrado**  
   Si no hay resultado en base ni en API, se devuelve `valid: true, found: false` (sin nombre). El usuario debe escribir el nombre; al guardar la factura o el cliente se persiste en `RncContribuyente` con `source: 'user'` para que la próxima consulta lo devuelva.

## Importar el listado DGII

La DGII publica un listado de contribuyentes (por ejemplo **DGII_RNC.TXT**). Puedes importarlo a MongoDB para que las consultas sean locales y no dependan de una API externa.

### Requisitos

- Archivo TXT o CSV con **cabecera**.
- Delimitador: coma, punto y coma, tab o pipe (`|`).
- Columnas que identifiquen:
  - **RNC/Cédula**: cabeceras como `RNC`, `rnc`, `Cédula`, etc.
  - **Nombre**: `Nombre`, `Nombre/Razón Social`, `RazonSocial`, `name`, etc.

### Cómo obtener el archivo

- Desde la **Oficina Virtual de la DGII** (dgii.gov.do) o el portal de contribuyentes registrados, donde suelen ofrecer el listado de RNC en TXT.

### Ejecutar la importación

1. Coloca el archivo en tu proyecto (por ejemplo `./DGII_RNC.txt`).

2. Desde la raíz del proyecto:

   ```bash
   node scripts/import-dgii-rnc.js ./DGII_RNC.txt
   ```

3. El script:
   - Detecta el delimitador y las columnas RNC y Nombre.
   - Valida que cada RNC tenga 9 o 11 dígitos y dígito verificador correcto.
   - Hace **upsert** en la colección `RncContribuyente` (por lotes de 1000).

4. Variables de entorno: debe existir **MONGODB_URI** (por ejemplo en `.env.local`).

### Ejemplo de formato de archivo

**TXT con tab (típico DGII):**

```
RNC	Nombre/Razón Social	Nombre Comercial	...
101010101	JUAN PEREZ	...
131888444	LEXIS BILL SOLUTIONS S.R.L.	...
```

**CSV:**

```csv
rnc,name
101010101,JUAN PEREZ
131888444,LEXIS BILL SOLUTIONS S.R.L.
```

## API externa (opcional)

Si usas un proveedor (por ejemplo MegaPlus) que expone una URL de consulta por RNC:

1. Configura en `.env` o en las variables de tu hosting:

   ```env
   DGII_RNC_API_URL=https://tu-proveedor.com/api/rnc
   ```

2. El backend hace `GET` a `DGII_RNC_API_URL?rnc=XXXXXXXXX` y espera JSON con alguno de estos campos para el nombre:  
   `razonSocial`, `nombreRazonSocial`, `name`, `nombre`, `RazonSocial`, `nombreComercial`.

3. Si la API devuelve un nombre válido, se guarda en `RncContribuyente` con `source: 'external_api'` para no volver a llamar a la API en la siguiente consulta del mismo RNC.

## Endpoints

- **GET /api/rnc/:number**  
  Consulta por RNC/cédula. Si se encuentra: `{ valid, found: true, rnc, name, type }`. Si no: `{ valid, found: false, rnc, type }` (el cliente debe escribir el nombre; al guardar factura/cliente se persiste).

- **POST /api/validate-rnc**  
  Body: `{ "rnc": "131888444" }`. Si se encuentra: `{ valid, found: true, name }`. Si no: `{ valid, found: false }`.

- **Guardado automático**  
  Al crear o actualizar un **cliente** (POST /api/customers) o al crear una **factura** (POST /api/invoices), si el RNC y el nombre del cliente están presentes, se hace upsert en `RncContribuyente` con `source: 'user'`, para que la próxima consulta devuelva ese nombre.

## Resumen

| Origen        | Uso |
|---------------|-----|
| MongoDB       | Listado DGII importado con `import-dgii-rnc.js`, caché de API externa o **nombres ingresados por usuarios** (al guardar factura/cliente). |
| API externa   | Opcional con `DGII_RNC_API_URL`; resultados se cachean en MongoDB. |
| No encontrado | Se devuelve `found: false`; el usuario escribe el nombre y al guardar se persiste para futuras consultas. |

Para tener consultas rápidas y sin depender de terceros, se recomienda importar el listado DGII con el script. Los RNC que no estén en el listado se pueden completar manualmente; al guardar la factura o el cliente, quedarán guardados para la próxima vez.
