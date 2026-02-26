import { NextResponse } from "next/server";

/**
 * Login: mismo dominio. Reenvía POST al backend interno /api/auth/login (vercel.json → api/index.js).
 */
export async function POST(request: Request) {
    try {
        const body = await request.text();
        const host = request.headers.get("host") || "";
        const origin = request.headers.get("x-forwarded-proto")
            ? `${request.headers.get("x-forwarded-proto")}://${host}`
            : host
                ? `https://${host}`
                : "";
        const url = origin ? `${origin}/api/auth/login` : "/api/auth/login";

        const forwardedFor = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Forwarded-Host": host,
                ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {})
            },
            body: body || undefined
        });

        const data = await res.json().catch(() => ({}));
        const response = NextResponse.json(data, { status: res.status });

        const setCookie = res.headers.get("set-cookie");
        if (setCookie) response.headers.set("Set-Cookie", setCookie);

        return response;
    } catch (err) {
        console.error("[login]", err);
        return NextResponse.json(
            { message: "El servidor de login no responde. Intenta en unos minutos." },
            { status: 502 }
        );
    }
}
