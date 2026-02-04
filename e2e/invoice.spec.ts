import { test, expect } from "@playwright/test";

test.describe("Nueva factura", () => {
    test.beforeEach(async ({ page }) => {
        const email = process.env.E2E_EMAIL || "test@lexisbill.com";
        const password = process.env.E2E_PASSWORD || "Test123!@#";
        await page.goto("/login");
        await page.getByLabel(/correo|email/i).fill(email);
        await page.getByLabel(/contraseña|password/i).fill(password);
        await page.getByRole("button", { name: /iniciar|entrar|login/i }).click();
        await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
    });

    test("accede a nueva factura y ve formulario", async ({ page }) => {
        await page.goto("/nueva-factura");
        await expect(page.getByRole("heading", { name: /nueva factura|crear factura/i })).toBeVisible({ timeout: 10000 });
        await expect(page.getByLabel(/cliente|nombre/i).first()).toBeVisible();
        await expect(page.getByLabel(/RNC|rnc|cédula/i)).toBeVisible();
    });

    test("crear factura mínima (cliente, RNC, ítem)", async ({ page }) => {
        await page.goto("/nueva-factura");
        await page.getByLabel(/cliente|nombre del cliente/i).first().fill("Cliente E2E Test");
        await page.getByLabel(/RNC|rnc|cédula/i).fill("131888444");
        await page.getByRole("combobox", { name: /tipo|comprobante/i }).first().click().catch(() => {});
        await page.getByText(/B02|consumo|32/i).first().click().catch(() => {});
        const descInput = page.locator('input[placeholder*="Descripción"], input[name*="description"]').first();
        await descInput.fill("Servicio E2E");
        const priceInput = page.locator('input[placeholder*="Precio"], input[name*="price"]').first();
        await priceInput.fill("1000");
        await page.waitForTimeout(500);
        const submitBtn = page.getByRole("button", { name: /guardar|emitir|generar factura/i });
        await submitBtn.click();
        await expect(page.getByText(/factura creada|éxito|guardada/i)).toBeVisible({ timeout: 12000 });
    });
});
