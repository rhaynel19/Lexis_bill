import { toast } from "sonner";

interface FetchOptions extends RequestInit {
    timeout?: number;
    retries?: number;
    cacheKey?: string; // Si se provee, habilita el sistema de caché (Solo para GET)
}

/**
 * secureFetch: Una capa robusta sobre fetch con:
 * 1. Exponential Backoff (Reintentos automáticos)
 * 2. Timeout (Abortar si tarda mucho)
 * 3. Manejo de Offline
 * 4. Caché de Respaldo (localStorage)
 */
export async function secureFetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
    const {
        timeout = 30000,
        retries = 3,
        cacheKey,
        headers,
        ...fetchOptions
    } = options;

    // 1. Interceptor de Conexión (Offline)
    if (typeof window !== 'undefined' && !navigator.onLine) {
        toast.warning("Modo sin conexión.\\nMostrando datos guardados.", { 
            duration: 8000,
            icon: "🔌"
        });

        // Intentar servir desde caché si es posible
        if (cacheKey) {
            const cached = localStorage.getItem(`cache_${cacheKey}`);
            if (cached) {
                console.warn(`[Offline] Serving cached data for ${cacheKey}`);
                return JSON.parse(cached);
            }
        }
        throw new Error("No internet connection and no cache available.");
    }

    let attempt = 0;

    while (attempt <= retries) {
        try {
            // 2. Control de Timeout
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                ...fetchOptions,
                credentials: 'include',
                headers: {
                    ...headers,
                    "Accept": "application/json",
                },
                signal: controller.signal
            }).catch(e => {
                if (e.message === 'Failed to fetch') {
                    throw new Error("Problema de conexión.\\nVerifica tu internet o intenta nuevamente.");
                }
                throw e;
            });

            clearTimeout(id);

            // Manejo de Errores HTTP (objeto con status, message y data para que el caller pueda mostrar el error real)
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                let errorMessage = errorData.message ?? errorData.error ?? `Error temporal del servidor.\\nEstamos trabajando para solucionarlo. Intenta nuevamente en unos minutos.`;
                if (typeof errorMessage !== "string") {
                    errorMessage = response.status >= 500
                        ? "Error temporal del servidor.\\nEstamos trabajando para solucionarlo. Intenta nuevamente en unos minutos."
                        : `Server Error: ${response.status}`;
                }
                if (response.status >= 500) {
                    errorMessage = "Error temporal del servidor.\\nEstamos trabajando para solucionarlo. Intenta nuevamente en unos minutos.";
                }
                const errPayload = { status: response.status, message: errorMessage, data: errorData };

                // Sesión expirada o no autorizado: redirigir a login solo si estamos en una ruta protegida (evitar redirigir desde landing tras logout)
                if (response.status === 401 && typeof window !== 'undefined') {
                    const path = window.location.pathname || '';
                    const isPublic = ['/', '/login', '/registro', '/landing', '/recuperar-contrasena', '/restablecer-contrasena', '/unirse-como-partner', '/programa-partners'].some(p => path === p || path.startsWith(p + '?'));
                    if (!isPublic) {
                        toast.error("Tu sesión ha expirado.\\nPor favor inicia sesión nuevamente.");
                        window.location.href = `/login?redirect=${encodeURIComponent(path)}`;
                    }
                    throw errPayload;
                }

                // Suscripción bloqueada (días de gracia pasados): redirigir a pagos
                if (response.status === 403 && errorData.code === 'SUBSCRIPTION_LOCKED' && typeof window !== 'undefined') {
                    toast.error("Tu cuenta está bloqueada por falta de pago. Regulariza para seguir usando la plataforma.");
                    window.location.href = "/pagos?locked=1";
                    throw errPayload;
                }

                // 4xx y 5xx: lanzar objeto con status, message y data para diagnóstico
                throw errPayload;
            }

            const data = response.status === 204 ? null : await response.json();

            // 3. Guardar en Caché (Si es exitoso y tiene key)
            if (cacheKey && typeof window !== 'undefined') {
                localStorage.setItem(`cache_${cacheKey}`, JSON.stringify(data));
            }

            return data as T;

        } catch (error: any) {
            attempt++;
            const isLastAttempt = attempt > retries;

            // Manejo de Timeout específico
            if (error.name === 'AbortError') {
                error.message = "Problema de conexión.\\nVerifica tu internet o intenta nuevamente.";
                if (isLastAttempt) {
                    toast.error("Problema de conexión.\\nVerifica tu internet o intenta nuevamente.", { icon: "📡" });

                    // Fallback a caché en timeout final
                    if (cacheKey) {
                        const cached = localStorage.getItem(`cache_${cacheKey}`);
                        if (cached) return JSON.parse(cached);
                    }
                    throw error;
                }
            }

            // Si es un error de cliente (4xx), no tiene sentido reintentar
            if (error.status && error.status >= 400 && error.status < 500) {
                throw error;
            }

            // Si agotamos los intentos
            if (isLastAttempt) {
                console.error(`[SecureFetch] Failed after ${retries} retries:`, error);

                // Último intento de caché
                if (cacheKey && typeof window !== 'undefined') {
                    const cached = localStorage.getItem(`cache_${cacheKey}`);
                    if (cached) {
                        toast.warning("Modo sin conexión.\\nMostrando datos guardados.", { icon: "🔌" });
                        return JSON.parse(cached);
                    }
                }
                throw error;
            }

            // Exponential Backoff: 1s, 2s, 4s...
            const delay = Math.pow(2, attempt - 1) * 1000;
            console.log(`[SecureFetch] Retrying in ${delay}ms... (Attempt ${attempt})`);
            await new Promise(r => setTimeout(r, delay));
        }
    }

    throw new Error("Unknown fetch error");
}
