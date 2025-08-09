// Version detection utility using fetch to public/version.json

function resolveServerUrl(relativePath: string): string {
  // Prefer an explicitly configured site URL if present
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(relativePath, explicit).toString();

  // Vercel provides VERCEL_URL without protocol
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}${relativePath}`;
  }

  // Local fallback
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}${relativePath}`;
}

export async function getAppVersion(): Promise<string> {
  try {
    const url = typeof window !== 'undefined' ? '/version.json' : resolveServerUrl('/version.json');
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch version.json: ${res.status}`);
    const data = (await res.json()) as { version?: string };
    if (data && typeof data.version === 'string' && data.version.length > 0) {
      return data.version;
    }
    throw new Error('version field missing');
  } catch {
    // Fallback to package.json version
    try {
      const packageJson = require('../../../package.json');
      return packageJson.version ? `v${packageJson.version}` : 'development';
    } catch {
      return 'development';
    }
  }
}

export async function getBuildInfo() {
  return {
    version: await getAppVersion(),
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString(),
    environment: process.env.VERCEL_ENV || 'development',
    branch: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF || 'unknown',
    commit: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'unknown',
  };
} 