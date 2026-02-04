import { test, expect } from "@playwright/test";

test.describe("Nueva cotización", () => {
    test.beforeEach(async ({ page }) => {
        const email = process.env.E2E_EMAIL || "test@lexisbill.com";
        const password = process.env.E2E_PASSWORD || "Test123!@#";
        await page.goto("/login");
        await page.getByLabel(/correo|email/i).fill(email);
        await page.getByLabel(/contraseña|password/i).fill(password);
        await page.getByRole("button", { name: /iniciar|entrar|login/i }).click();
        await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
    });

    test("accede a nueva cotización y ve formulario", async ({ page }) => {
        await page.goto("/nueva-cotizacion");
        await expect(page.getByRole("heading", { name: /nueva cotización|cotización/i })).toBeVisible({ timeout: 10000 });
        await expect(page.getByLabel(/cliente|nombre/i).first()).toBeVisible();
        await expect(page.getByLabel(/RNC|rnc|cédula/i)).toBeVisible();
    });

    test("crear cotización mínima", async ({ page }) => {
        await page.goto("/nueva-cotizacion");
        await page.getByLabel(/cliente|nombre del cliente/i).first().fill("Cliente Cotización E2E");
        await page.getByLabel(/RNC|rnc|cédula/i).fill("131888444");
        const descInput = page.locator('input[placeholder*="Descripción"], input[name*="description"]').first();
        await descInput.fill("Servicio cotización E2E");
        const priceInput = page.locator('input[placeholder*="Precio"], input[name*="price"]').first();
        await priceInput.fill("500");
        await page.waitForTimeout(500);
        const saveBtn = page.getByRole("button", { name: /guardar|crear cotización|enviar/i });
        await saveBtn.click();
        await expect(page.getByText(/cotización creada|guardada|éxito/i)).toBeVisible({ timeout: 12000 });
    });
});
