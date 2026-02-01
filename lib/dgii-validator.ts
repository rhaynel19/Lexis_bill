/**
 * Motor de Validación DGII - Reportes 606/607
 * Cumplimiento Norma General 07-2018 / 05-2019
 * Valida estructura, columnas y formatos antes de permitir descarga
 */

const DGII_EXPENSE_CATEGORIES = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Valida estructura NCF según DGII
 * Formato: B/E + 2 dígitos tipo + 8/10 dígitos secuencia
 */
export function validateNCFStructure(ncf: string): ValidationResult {
  const errors: string[] = [];
  if (!ncf || typeof ncf !== "string") {
    return { valid: false, errors: ["NCF requerido"] };
  }
  const clean = ncf.replace(/[^\dA-Za-z]/g, "");
  if (clean.length < 11) {
    errors.push(`NCF "${maskNcf(ncf)}" debe tener al menos 11 caracteres`);
  }
  if (!clean.startsWith("B") && !clean.startsWith("E")) {
    errors.push(`NCF "${maskNcf(ncf)}" debe iniciar con B o E`);
  }
  const tipo = clean.slice(1, 3);
  if (!/^\d{2}$/.test(tipo)) {
    errors.push(`NCF "${maskNcf(ncf)}" tipo debe ser 2 dígitos`);
  }
  const sec = clean.slice(3);
  if (!/^\d+$/.test(sec)) {
    errors.push(`NCF "${maskNcf(ncf)}" secuencia debe ser numérica`);
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

function maskNcf(ncf: string): string {
  if (!ncf || ncf.length < 6) return "***";
  return ncf.slice(0, 2) + "***" + ncf.slice(-4);
}

/**
 * Formato 607 - Ventas
 * Header: 607|RNC|periodo|cantidad
 * Línea: RNC|TipoId|NCF|NCFModificado|TipoIngreso|FechaComprobante|FechaRetencion|
 *        MontoFacturado|ITBISFacturado|ITBISRetenido|ITBISPercibido|RetencionRenta|ISR|ISC|OtrosImpuestos|MontoTotal|
 *        ITBIS3ros|Percepciones|Intereses|IngresosTerceros
 * 19 campos por línea de datos
 */
export function validate607Format(content: string): ValidationResult {
  const errors: string[] = [];
  const lines = content.trim().split("\n").filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { valid: false, errors: ["Archivo vacío"] };
  }

  const header = lines[0];
  const headerParts = header.split("|");
  if (headerParts.length < 4) {
    errors.push("Cabecera 607: debe tener formato 607|RNC|periodo|cantidad");
  }
  if (headerParts[0] !== "607") {
    errors.push("Cabecera 607: debe iniciar con 607");
  }
  if (headerParts[1] && !/^\d{9,11}$/.test(headerParts[1].replace(/\D/g, ""))) {
    errors.push("Cabecera 607: RNC emisor inválido");
  }
  if (headerParts[2] && !/^\d{6}$/.test(headerParts[2])) {
    errors.push("Cabecera 607: periodo debe ser YYYYMM");
  }

  const dataLines = lines.slice(1);
  const expectedCols = 19;

  dataLines.forEach((line, idx) => {
    const parts = line.split("|");
    if (parts.length !== expectedCols) {
      errors.push(`Línea ${idx + 2}: se esperan ${expectedCols} columnas, hay ${parts.length}`);
    }
    if (parts.length >= 6) {
      const fecha = parts[5];
      if (fecha && !/^\d{8}$/.test(fecha)) {
        errors.push(`Línea ${idx + 2}: fecha comprobante debe ser YYYYMMDD`);
      }
    }
    if (parts.length >= 7) {
      const monto = parts[7];
      if (monto && isNaN(parseFloat(monto))) {
        errors.push(`Línea ${idx + 2}: monto facturado debe ser numérico`);
      }
    }
    if (parts.length >= 8) {
      const itbis = parts[8];
      if (itbis && isNaN(parseFloat(itbis))) {
        errors.push(`Línea ${idx + 2}: ITBIS facturado debe ser numérico`);
      }
    }
    if (parts.length >= 15) {
      const total = parts[15];
      if (total && isNaN(parseFloat(total))) {
        errors.push(`Línea ${idx + 2}: monto total debe ser numérico`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Formato 606 - Compras
 * Header: 606|RNC|periodo|cantidad
 * Línea: RNC|TipoId|Categoria|NCF|...|Fecha|...|Montos...
 */
export function validate606Format(content: string): ValidationResult {
  const errors: string[] = [];
  const lines = content.trim().split("\n").filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { valid: false, errors: ["Archivo vacío"] };
  }

  const header = lines[0];
  const headerParts = header.split("|");
  if (headerParts.length < 4) {
    errors.push("Cabecera 606: debe tener formato 606|RNC|periodo|cantidad");
  }
  if (headerParts[0] !== "606") {
    errors.push("Cabecera 606: debe iniciar con 606");
  }
  if (headerParts[2] && !/^\d{6}$/.test(headerParts[2])) {
    errors.push("Cabecera 606: periodo debe ser YYYYMM");
  }

  const dataLines = lines.slice(1);
  const expectedCols = 24;

  dataLines.forEach((line, idx) => {
    const parts = line.split("|");
    if (parts.length < 10) {
      errors.push(`Línea ${idx + 2}: columnas insuficientes (mínimo 10)`);
    }
    if (parts.length >= 4) {
      const cat = parts[2];
      if (cat && !DGII_EXPENSE_CATEGORIES.includes(cat)) {
        errors.push(`Línea ${idx + 2}: categoría ${cat} inválida (01-11)`);
      }
    }
    if (parts.length >= 5) {
      const ncfCheck = validateNCFStructure(parts[3] || "");
      if (!ncfCheck.valid) {
        errors.push(`Línea ${idx + 2}: ${ncfCheck.errors.join("; ")}`);
      }
    }
    if (parts.length >= 7) {
      const fecha = parts[5];
      if (fecha && !/^\d{8}$/.test(fecha)) {
        errors.push(`Línea ${idx + 2}: fecha debe ser YYYYMMDD`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
