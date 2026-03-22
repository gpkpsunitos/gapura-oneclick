import path from 'node:path';
import { fileURLToPath } from 'node:url';
import webpack from 'webpack';
import withSerwistInit from '@serwist/next';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  register: false,
  reloadOnOnline: false,
  cacheOnNavigation: false,
  scope: '/',
  additionalPrecacheEntries: [
    { url: '/', revision: '2026-03-stable' },
    { url: '/auth/login', revision: '2026-03-stable' },
    { url: '/auth/public-report', revision: '2026-03-stable' },
    { url: '/offline', revision: '2026-03-stable' },
    { url: '/icons/pwa-192.png', revision: '2026-03-stable' },
    { url: '/icons/pwa-192-maskable.png', revision: '2026-03-stable' },
    { url: '/icons/pwa-512.png', revision: '2026-03-stable' },
    { url: '/icons/pwa-512-maskable.png', revision: '2026-03-stable' },
    { url: '/screenshots/login-install.png', revision: '2026-03-stable' },
    { url: '/screenshots/public-report-install.png', revision: '2026-03-stable' },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ignore node: prefixed imports from pptxgenjs (they're conditionally used in Node only)
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^node:(fs|https|http|path|crypto|stream|zlib|util|buffer)$/,
        })
      );
    }
    return config;
  },
};

export default withSerwist(nextConfig);
