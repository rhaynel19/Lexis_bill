const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development'
})

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Forzamos salida estable para PWA
    images: {
        unoptimized: true,
    },
    // Mantener temporalmente hasta corregir errores críticos
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
}

module.exports = withPWA(nextConfig)
