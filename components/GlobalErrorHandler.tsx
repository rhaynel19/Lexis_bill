"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Componente que registra manejadores globales de errores para capturar 
 * promesas no manejadas, especialmente las de secureFetch (APIError).
 */
export function GlobalErrorHandler() {
    useEffect(() => {
        const handleRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;

            // 1. Detect standard APIError (the new way)
            const isAPIError = reason && (reason instanceof Error || reason.name === "APIError");
            
            // 2. Detect legacy plain object rejections (the old way)
            const isLegacyAPIObject = reason && 
                typeof reason === 'object' && 
                'status' in reason && 
                'message' in reason &&
                'data' in reason;

            if (isAPIError || isLegacyAPIObject) {
                // Silenciamos estos errores porque ya son conocidos y manejados 
                // o son fallos esperados de la API (404s, 401s, etc.)
                event.preventDefault();

                if (process.env.NODE_ENV === 'development') {
                    console.warn("[GlobalErrorHandler] Silenced predictable API rejection:", reason);
                }
            }
        };

        window.addEventListener("unhandledrejection", handleRejection);
        return () => window.removeEventListener("unhandledrejection", handleRejection);
    }, []);

    return null;
}
