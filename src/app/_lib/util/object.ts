export function objectToStringArray<T extends Record<string, any>>(obj: T): string[] {
  return Object.entries(obj)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}:${String(value)}`);
}
