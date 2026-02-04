/**
 * Tests unitarios: validadores RNC y Cédula (República Dominicana)
 * Ejecutar: npm test
 */
import { describe, it, expect } from "vitest";
import { validateRNC, validateCedula, validateRNCOrCedula } from "@/lib/validators";

describe("validateRNC", () => {
    it("acepta RNC de 9 dígitos", () => {
        expect(validateRNC("131888444").isValid).toBe(true);
        expect(validateRNC("101010101").isValid).toBe(true);
    });

    it("rechaza vacío", () => {
        expect(validateRNC("").isValid).toBe(false);
        expect(validateRNC("   ").isValid).toBe(false);
    });

    it("rechaza menos de 9 dígitos", () => {
        expect(validateRNC("12345678").isValid).toBe(false);
    });

    it("rechaza más de 9 dígitos", () => {
        expect(validateRNC("1234567890").isValid).toBe(false);
    });

    it("rechaza caracteres no numéricos", () => {
        expect(validateRNC("131-888-444").isValid).toBe(false);
        expect(validateRNC("13A888444").isValid).toBe(false);
    });
});

describe("validateCedula", () => {
    it("acepta cédula de 11 dígitos", () => {
        expect(validateCedula("40222222222").isValid).toBe(true);
        expect(validateCedula("001-1234567-8").isValid).toBe(true);
    });

    it("rechaza vacío", () => {
        expect(validateCedula("").isValid).toBe(false);
    });

    it("rechaza menos de 11 dígitos", () => {
        expect(validateCedula("4022222222").isValid).toBe(false);
    });

    it("rechaza más de 11 dígitos", () => {
        expect(validateCedula("402222222222").isValid).toBe(false);
    });
});

describe("validateRNCOrCedula", () => {
    it("acepta RNC de 9 dígitos", () => {
        const r = validateRNCOrCedula("131888444");
        expect(r.isValid).toBe(true);
    });

    it("acepta cédula de 11 dígitos", () => {
        const r = validateRNCOrCedula("40222222222");
        expect(r.isValid).toBe(true);
    });

    it("rechaza longitud inválida", () => {
        expect(validateRNCOrCedula("12345").isValid).toBe(false);
    });
});
