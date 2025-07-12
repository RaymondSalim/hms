import { execSync } from 'child_process';

/** @type {import('next').NextConfig} */
const revision = (() => {
    try {
        return execSync('git describe --tags --always').toString().trim();
    } catch {
        return 'development';
    }
})();

const nextConfig = {
    env: {
        NEXT_PUBLIC_APP_VERSION: revision,
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '15mb',
        },
    },
};

export default nextConfig;
