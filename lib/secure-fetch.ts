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
        timeout = 10000,
        retries = 3,
        cacheKey,
        headers,
        ...fetchOptions
    } = options;

    // 1. Interceptor de Conexión (Offline)
    if (typeof window !== 'undefined' && !navigator.onLine) {
        toast.error("📡 Sin conexión a internet. Los datos se sincronizarán cuando vuelvas a estar en línea.");

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
                headers: {
                    ...headers,
                    // Headers por defecto recomendados para evitar problemas de CORS/Content-Type
                    "Accept": "application/json",
                },
                signal: controller.signal
            });

            clearTimeout(id);

            // Manejo de Errores HTTP
            if (!response.ok) {
                // Si es un error 4xx (Cliente), no reintentar (probablemente no se arregle reintentando)
                if (response.status >= 400 && response.status < 500) {
                    const errorData = await response.json().catch(() => ({}));
                    throw { status: response.status, message: errorData.message || "Error en la petición" };
                }

                // Si es 5xx (Servidor), lanzar error para activar el catch y reintentar
                throw new Error(`Server Error: ${response.status}`);
            }

            const data = await response.json();

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
                if (isLastAttempt) {
                    toast.error("⏱️ La petición tardó demasiado. Verifique su conexión.");

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
                        toast.warning("⚠️ Problemas de conexión. Mostrando datos guardados.");
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
