import * as Sentry from "@sentry/nextjs";

/**
 * Inicialización del SDK de Sentry en el cliente (navegador).
 * Este archivo reemplaza sentry.client.config.ts para Next.js 15+.
 */
Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    debug: process.env.NODE_ENV === "development",
    tracesSampleRate: 0.1,
    tunnel: "/monitoring",
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
