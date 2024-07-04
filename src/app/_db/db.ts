export type OmitIDTypeAndTimestamp<T> = Omit<T, "id" | "createdAt" | "updatedAt">;
export type OmitTimestamp<T> = Omit<T, "createdAt" | "updatedAt">;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<T>;
