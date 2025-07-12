const STORAGE_KEY = 'app.lastSeenVersion';

export function getLastSeenVersion(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setLastSeenVersion(version: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch {
    // ignore storage errors (e.g., quota exceeded, privacy mode)
  }
}

export function hasSeenVersion(version: string): boolean {
  const last = getLastSeenVersion();
  return last === version;
}