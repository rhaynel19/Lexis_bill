const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development'
})

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    webpack: (config) => {
        // Asegurar compatibilidad con Webpack para next-pwa y otras utilidades
        return config;
    },
    // Forzamos salida estable para PWA
    images: {
        unoptimized: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    // Fix for Turbopack/Webpack conflict in Next.js 15+
    experimental: {
        turbopack: {},
    },
}

module.exports = withPWA(nextConfig)
