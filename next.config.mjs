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
        NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    },
    serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
