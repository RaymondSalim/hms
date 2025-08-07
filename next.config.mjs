/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '15mb',
        },
        staleTimes: {
            dynamic: 30,
            static: 180,
        }
    },
    env: {
        // Vercel automatically provides these
        NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
        NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
        // Version from GitHub action (stored in .env.production)
        NEXT_PUBLIC_VERSION: process.env.VERSION || 'development',
        NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    },
};

export default nextConfig;
