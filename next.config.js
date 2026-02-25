const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development'
})

const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: { unoptimized: true },

    // === HEADERS DE SEGURIDAD ===
    async headers() {
        return [
            {
                // Aplicar a todas las rutas
                source: '/:path*',
                headers: [
                    // Previene ataques MIME sniffing
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    // Previene clickjacking (no permitir iframes)
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY'
                    },
                    // Filtro XSS del navegador (legacy pero útil)
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    // Control de información del referer
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    },
                    // Forzar HTTPS (solo en producción)
                    ...(process.env.NODE_ENV === 'production' ? [{
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains; preload'
                    }] : []),
                    // Controla qué APIs del navegador puede usar la página
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
                    },
                    // Content Security Policy - Protección contra XSS
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.vercel.app",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                            "font-src 'self' https://fonts.gstatic.com data:",
                            "img-src 'self' data: blob: https:",
                            "connect-src 'self' https://*.vercel.app https://api.dgii.gov.do https://*.sentry.io wss:",
                            "frame-ancestors 'none'",
                            "form-action 'self'",
                            "base-uri 'self'",
                            "object-src 'none'",
                            "upgrade-insecure-requests"
                        ].join('; ')
                    }
                ]
            }
        ];
    },

    // Proxy /api al backend (dev y producción). beforeFiles = el rewrite se aplica antes de rutas de la app.
    // En producción hay que definir NEXT_PUBLIC_API_URL (ej. https://api.lexisbill.com.do/api) para que el login funcione.
    async rewrites() {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const destination = apiUrl
            ? `${apiUrl.replace(/\/api\/?$/, "")}/api/:path*`
            : process.env.NODE_ENV === "development"
                ? "http://localhost:3001/api/:path*"
                : null;
        if (destination) {
            return { beforeFiles: [{ source: "/api/:path*", destination }] };
        }
        return { beforeFiles: [] };
    },
}

const sentryWebpackPluginOptions = {
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    tunnelRoute: "/monitoring",
};

const configWithPWA = withPWA(nextConfig);
module.exports = process.env.NEXT_PUBLIC_SENTRY_DSN
    ? withSentryConfig(configWithPWA, sentryWebpackPluginOptions)
    : configWithPWA;
