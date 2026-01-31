const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development'
})

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: { unoptimized: true },
    // Proxy /api al backend en dev (cookies same-origin)
    async rewrites() {
        if (process.env.NODE_ENV === "development") {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
            return [{ source: "/api/:path*", destination: `${apiUrl.replace(/\/api$/, "")}/api/:path*` }];
        }
        return [];
    },
}

module.exports = withPWA(nextConfig)
