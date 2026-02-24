import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware de autenticación - protege rutas (protected)
 * Verifica cookie HttpOnly lexis_auth en rutas bajo /dashboard, /cotizaciones, etc.
 * Las rutas en app/(protected)/ se sirven bajo el mismo path, por eso usamos matcher.
 */
const PROTECTED_PATHS = [
    "/onboarding",
    "/dashboard",
    "/nueva-factura",
    "/nueva-cotizacion",
    "/cotizaciones",
    "/reportes",
    "/configuracion",
    "/clientes",
    "/gastos",
    "/pagos",
    "/documentos",
    "/partners",
    "/partner",
    "/admin",
    "/ayuda"
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Redirect typo /logir → /login (mantiene query string)
    if (pathname === "/logir") {
        const loginUrl = new URL("/login", request.url);
        request.nextUrl.searchParams.forEach((v, k) => loginUrl.searchParams.set(k, v));
        return NextResponse.redirect(loginUrl);
    }

    const isProtected = PROTECTED_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));
    if (!isProtected) return NextResponse.next();

    const token = request.cookies.get("lexis_auth")?.value;
    if (!token) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/logir",
        "/onboarding/:path*",
        "/dashboard/:path*",
        "/nueva-factura/:path*",
        "/nueva-cotizacion/:path*",
        "/cotizaciones/:path*",
        "/reportes/:path*",
        "/configuracion/:path*",
        "/clientes/:path*",
        "/gastos/:path*",
        "/pagos/:path*",
        "/documentos/:path*",
        "/partners/:path*",
        "/partner/:path*",
        "/admin/:path*",
        "/ayuda/:path*"
    ]
};
