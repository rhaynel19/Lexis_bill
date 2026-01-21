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
}

module.exports = withPWA(nextConfig)
