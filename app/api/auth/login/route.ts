import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy de login: cuando la petición llega a Next.js (p. ej. rewrite no aplicó),
 * reenvía POST al API definido en NEXT_PUBLIC_API_URL. Evita 405 y permite que el login funcione.
 */
export async function POST(request: NextRequest) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const base = apiUrl?.replace(/\/api\/?$/, "");
    if (!base) {
        return NextResponse.json(
            {
                message: "Configure NEXT_PUBLIC_API_URL en Vercel (ej. https://api.lexisbill.com.do/api) y redepliegue.",
                code: "API_URL_NOT_CONFIGURED"
            },
            { status: 503 }
        );
    }

    try {
        const body = await request.text();
        const host = request.headers.get("host") || "";
        const res = await fetch(`${base}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Forwarded-Host": host
            },
            body: body || undefined
        });

        const data = await res.json().catch(() => ({}));
        const response = NextResponse.json(data, { status: res.status });

        // Reenviar cookie del backend al cliente para que la sesión funcione
        const setCookie = res.headers.get("set-cookie");
        if (setCookie) response.headers.set("Set-Cookie", setCookie);

        return response;
    } catch (err) {
        console.error("[login proxy]", err);
        return NextResponse.json(
            { message: "El servidor de login no responde. Intenta en unos minutos.", code: "PROXY_ERROR" },
            { status: 502 }
        );
    }
}
