import { NextResponse } from "next/server";

/**
 * Handler para POST /api/auth/login cuando las rewrites no aplican (producción sin NEXT_PUBLIC_API_URL).
 * Evita 405: devuelve 503 con mensaje claro. Con NEXT_PUBLIC_API_URL definida, next.config reescribe /api/* al backend y esta ruta no se invoca.
 */
export async function POST() {
    return NextResponse.json(
        {
            message: "El servicio de inicio de sesión no está disponible. El administrador debe configurar NEXT_PUBLIC_API_URL en el servidor de despliegue (p. ej. Vercel) y volver a desplegar.",
            code: "API_URL_NOT_CONFIGURED"
        },
        { status: 503 }
    );
}
