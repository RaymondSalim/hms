export type OmitIDTypeAndTimestamp<T> = Omit<T, "id" | "createdAt" | "updatedAt">;
