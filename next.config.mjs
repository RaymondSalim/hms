import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { getVersion } = require('./scripts/get-version.js');

/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '15mb',
        },
    },
    env: {
        // Vercel automatically provides these
        NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
        NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
        // Custom version detection
        NEXT_PUBLIC_APP_VERSION: getVersion(),
        NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    },
};

export default nextConfig;
