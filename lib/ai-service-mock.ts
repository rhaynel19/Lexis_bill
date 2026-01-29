
export const AIService = {
    // Generate a human-readable monthly summary
    generateMonthlyInsight: (revenue: number, previousRevenue: number, pendingCount: number, profession: string): string => {
        // Mock logic - in production this would call an LLM API
        const growth = revenue > previousRevenue;
        const diff = Math.abs(revenue - previousRevenue);

        const professionTones: Record<string, string> = {
            "medic": "Dr/Dra.",
            "lawyer": "Lic.",
            "engineer": "Ing.",
            "general": ""
        };
        const title = professionTones[profession] || "";

        let insight = `Hola ${title}, `;

        if (revenue === 0) {
            insight += "este mes recién comienza. Cuando estés listo, crea tu primera factura para empezar a sumar.";
        } else if (growth) {
            insight += `vas muy bien este mes. Has facturado más que el mes anterior. `;
            if (pendingCount > 0) insight += `Solo recuerda que tienes ${pendingCount} facturas pendientes de cobro.`;
        } else {
            insight += `tienes un ritmo estable. `;
            if (pendingCount > 3) insight += `Sería bueno dar seguimiento a las ${pendingCount} facturas pendientes para mejorar el flujo.`;
        }

        return insight;
    },

    // Predict upcoming tax tasks
    predictNextTaxTask: (dayOfMonth: number): { task: string, urgency: "low" | "medium" | "high" } => {
        if (dayOfMonth > 15 && dayOfMonth < 20) {
            return { task: "Preparar envío de 606/607 (Vence el 20)", urgency: "high" };
        }
        if (dayOfMonth < 5) {
            return { task: "Cierre de mes anterior", urgency: "medium" };
        }
        return { task: "Todo al día", urgency: "low" };
    },

    // Parse natural language text into invoice items
    // Example: "Instalación de 3 aires por 5000 cada uno"
    parseInvoiceText: (text: string): Promise<{ description: string, quantity: number, price: number }[]> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const items: { description: string, quantity: number, price: number }[] = [];
                // Simple heuristic parser (Mocking NLP)

                // Case 1: "3 x Product at 100" or "3 Product 100"
                // Regex for: Number (qty) ... Text (Description) ... Number (Price)
                // This is very basic, a real LLM would be used here.

                // Mock responses for demo purposes if specific keywords appear
                if (text.toLowerCase().includes("aire") || text.toLowerCase().includes("ac")) {
                    items.push({ description: "Instalación de Aire Acondicionado 12BTU", quantity: 1, price: 4500 });
                    items.push({ description: "Materiales de Instalación (Kit Básico)", quantity: 1, price: 1500 });
                } else if (text.toLowerCase().includes("igual") || text.toLowerCase().includes("mensual")) {
                    items.push({ description: "Servicios Profesionales (Iguala Mensual)", quantity: 1, price: 25000 });
                } else if (text.toLowerCase().includes("consulta")) {
                    items.push({ description: "Consulta Médica General", quantity: 1, price: 3000 });
                } else {
                    // Fallback heuristic: Try to find a number at the end (Price) and assume rest is description
                    const parts = text.split(" ");
                    const lastPart = parts[parts.length - 1];
                    const possiblePrice = parseFloat(lastPart);

                    if (!isNaN(possiblePrice) && parts.length > 1) {
                        const desc = parts.slice(0, parts.length - 1).join(" ");
                        items.push({ description: desc, quantity: 1, price: possiblePrice });
                    } else {
                        // Default fallback
                        items.push({ description: text, quantity: 1, price: 0 });
                    }
                }

                resolve(items);
            }, 800); // Simulate network delay
        });
    },

    // Mock OCR Extraction for Expenses
    extractExpenseData: (file: File): Promise<{ supplierName: string, supplierRnc: string, ncf: string, amount: number, itbis: number, category: string }> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Mock scanning logic: Randomly pick from a list of simulated results
                const mockResults = [
                    { supplierName: "Altice Dominicana", supplierRnc: "101001614", ncf: "B0100000123", amount: 2450.00, itbis: 441.00, category: "02" },
                    { supplierName: "Edesur Dominicana", supplierRnc: "101783561", ncf: "B0100009874", amount: 1200.00, itbis: 0, category: "02" },
                    { supplierName: "Supermercados Bravo", supplierRnc: "101657890", ncf: "B0100045621", amount: 3500.50, itbis: 630.09, category: "01" },
                    { supplierName: "Ferreteria Americana", supplierRnc: "101002345", ncf: "B0100022334", amount: 500.00, itbis: 90.00, category: "05" }
                ];

                const result = mockResults[Math.floor(Math.random() * mockResults.length)];
                resolve(result);
            }, 2000); // Wait 2s to feel like "scanning"
        });
    }
};
