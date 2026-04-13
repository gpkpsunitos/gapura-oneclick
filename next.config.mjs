/** @type {import('next').NextConfig} */
const nextConfig = {
    poweredByHeader: false,

    experimental: {
        optimizePackageImports: [
            'lucide-react',
            'recharts',
            'framer-motion',
            'date-fns',
            'file-saver',
        ],
        workerThreads: false,
    },

    compiler: {
        removeConsole: process.env.NODE_ENV === 'production'
            ? { exclude: ['error', 'warn'] }
            : false,
    },

    turbopack: {
        // [FIX] Explicitly declare the project root to silence the
        // "Next.js inferred your workspace root" warning caused by
        // multiple lockfiles (bun.lock + package-lock.json).
        root: process.cwd(),
    },

    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                fs: false,
                path: false,
            };
        }
        return config;
    },

    images: {
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.supabase.co',
            },
            {
                protocol: 'https',
                hostname: '**.supabase.in',
            },
        ],
    },

    headers: async () => [
        {
            source: "/(.*)",
            headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "X-Frame-Options", value: "DENY" },
                { key: "X-XSS-Protection", value: "1; mode=block" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
                { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
                {
                    key: "Content-Security-Policy",
                    value: [
                        "default-src 'self'",
                        "script-src 'self' 'unsafe-inline' https://vercel.live",
                        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                        "font-src 'self' https://fonts.gstatic.com",
                        "img-src 'self' data: blob: https:",
                        "connect-src 'self' https:",
                        "frame-ancestors 'none'",
                        "base-uri 'self'",
                        "form-action 'self'",
                    ].join("; "),
                },
            ],
        },
        {
            source: "/api/embed/(.*)",
            headers: [
                { key: "Cache-Control", value: "public, s-maxage=120, stale-while-revalidate=300" },
            ],
        },
        {
            source: "/api/dashboards/filter-options",
            headers: [
                { key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" },
            ],
        },
        {
            source: "/api/master-data",
            headers: [
                { key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" },
            ],
        },
        {
            source: "/sw.js",
            headers: [
                { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
                {
                    key: "Content-Security-Policy",
                    value: "default-src 'self'; script-src 'self'; connect-src 'self' https:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';",
                },
            ],
        },
        {
            source: "/manifest.webmanifest",
            headers: [
                { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
            ],
        },
        {
            source: "/_next/static/:path*.js",
            headers: [
                { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
            ],
        },
        {
            source: "/(.*).css",
            headers: [
                { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
            ],
        },
    ],
};

export default nextConfig;
