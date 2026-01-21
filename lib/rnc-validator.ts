/**
 * Simulación de validación de RNC/Cédula
 * En producción, esto consultaría a la API de DGII o un servicio intermedio.
 */

interface Taxpayer {
    rnc: string;
    name: string;
    type: "Física" | "Jurídica";
    status: "Active" | "Inactive";
}

// Base de datos simulada de contribuyentes
const MOCK_DB: Record<string, Taxpayer> = {
    "101010101": { rnc: "101010101", name: "JUAN PEREZ (EJEMPLO)", type: "Física", status: "Active" },
    "123456789": { rnc: "123456789", name: "EMPRESA EJEMPLO S.R.L.", type: "Jurídica", status: "Active" },
    "987654321": { rnc: "987654321", name: "CLINICA CORAZON S.A.", type: "Jurídica", status: "Active" },
    "40200000000": { rnc: "40200000000", name: "DRA. MARIA RODRIGUEZ", type: "Física", status: "Active" },
    "40211111111": { rnc: "40211111111", name: "ARQ. PEDRO MARTINEZ", type: "Física", status: "Active" }
};

export async function validateRNC(rnc: string): Promise<Taxpayer | null> {
    // Simular retardo de red
    await new Promise(resolve => setTimeout(resolve, 500));

    // Limpiar RNC (solo números)
    const cleanCurrent = rnc.replace(/[^\d]/g, "");

    // Buscar en mock DB
    if (MOCK_DB[cleanCurrent]) {
        return MOCK_DB[cleanCurrent];
    }

    // Fallback: Si no está en DB, generar nombre genérico si es válido
    if (cleanCurrent.length === 9) {
        return { rnc: cleanCurrent, name: "SOCIEDAD COMERCIAL GENERICA S.R.L.", type: "Jurídica", status: "Active" };
    } else if (cleanCurrent.length === 11) {
        return { rnc: cleanCurrent, name: "CONTRIBUYENTE PERSONA FÍSICA", type: "Física", status: "Active" };
    }

    return null;
}
