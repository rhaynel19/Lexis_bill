"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Página /logir (typo): redirige a /login.
 * Fallback por si el middleware no aplica (p. ej. caché o CDN).
 */
export default function LogirRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        const search = typeof window !== "undefined" ? window.location.search : "";
        router.replace("/login" + search);
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-lexis-bg-deep">
            <p className="text-slate-500">Redirigiendo a inicio de sesión...</p>
        </div>
    );
}
