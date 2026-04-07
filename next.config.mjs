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
};

export default nextConfig;
