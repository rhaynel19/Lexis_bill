import { test, expect } from "@playwright/test";

test.describe("Login", () => {
    test("debe mostrar formulario de login", async ({ page }) => {
        await page.goto("/login");
        await expect(page.getByRole("heading", { name: /iniciar sesión|login/i })).toBeVisible({ timeout: 10000 });
        await expect(page.getByLabel(/correo|email/i)).toBeVisible();
        await expect(page.getByLabel(/contraseña|password/i)).toBeVisible();
    });

    test("con credenciales inválidas muestra error", async ({ page }) => {
        await page.goto("/login");
        await page.getByLabel(/correo|email/i).fill("noexiste@test.com");
        await page.getByLabel(/contraseña|password/i).fill("wrongpass");
        await page.getByRole("button", { name: /iniciar|entrar|login/i }).click();
        await expect(page.getByText(/incorrecto|inválido|error/i)).toBeVisible({ timeout: 8000 });
    });

    test("con credenciales válidas redirige al dashboard", async ({ page }) => {
        const email = process.env.E2E_EMAIL || "test@lexisbill.com";
        const password = process.env.E2E_PASSWORD || "Test123!@#";
        await page.goto("/login");
        await page.getByLabel(/correo|email/i).fill(email);
        await page.getByLabel(/contraseña|password/i).fill(password);
        await page.getByRole("button", { name: /iniciar|entrar|login/i }).click();
        await expect(page).toHaveURL(/dashboard|\/dashboard/, { timeout: 15000 });
    });
});
