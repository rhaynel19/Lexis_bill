/**
 * Validación de RNC/Cédula: consulta al backend (/api/rnc), que puede usar DGII o proveedor real (DGII_RNC_API_URL).
 * Si la API no está disponible o falla, se usa fallback local (mock/genérico).
 */

interface Taxpayer {
    rnc: string;
    name: string;
    type: "Física" | "Jurídica";
    status: "Active" | "Inactive";
}

const MOCK_DB: Record<string, Taxpayer> = {
    "101010101": { rnc: "101010101", name: "JUAN PEREZ (EJEMPLO)", type: "Física", status: "Active" },
    "123456789": { rnc: "123456789", name: "EMPRESA EJEMPLO S.R.L.", type: "Jurídica", status: "Active" },
    "987654321": { rnc: "987654321", name: "CLINICA CORAZON S.A.", type: "Jurídica", status: "Active" },
    "40200000000": { rnc: "40200000000", name: "DRA. MARIA RODRIGUEZ", type: "Física", status: "Active" },
    "40211111111": { rnc: "40211111111", name: "ARQ. PEDRO MARTINEZ", type: "Física", status: "Active" }
};

function mapApiToTaxpayer(data: { valid: boolean; rnc?: string; name?: string; type?: string }): Taxpayer | null {
    if (!data.valid || !data.name) return null;
    const rnc = (data.rnc || "").replace(/[^\d]/g, "");
    const type = (data.type === "JURIDICA" ? "Jurídica" : "Física") as "Física" | "Jurídica";
    return { rnc, name: data.name, type, status: "Active" };
}

export async function validateRNC(rnc: string): Promise<Taxpayer | null> {
    const cleanCurrent = rnc.replace(/[^\d]/g, "");

    if (typeof window !== "undefined") {
        try {
            const url = `/api/rnc/${encodeURIComponent(cleanCurrent)}`;
            const res = await fetch(url, { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                const taxpayer = mapApiToTaxpayer(data);
                if (taxpayer) return taxpayer;
            }
        } catch {
            // Fallback a mock/local
        }
    }

    if (MOCK_DB[cleanCurrent]) return MOCK_DB[cleanCurrent];
    if (cleanCurrent.length === 9) {
        return { rnc: cleanCurrent, name: "SOCIEDAD COMERCIAL GENERICA S.R.L.", type: "Jurídica", status: "Active" };
    }
    if (cleanCurrent.length === 11) {
        return { rnc: cleanCurrent, name: "CONTRIBUYENTE PERSONA FÍSICA", type: "Física", status: "Active" };
    }
    return null;
}
