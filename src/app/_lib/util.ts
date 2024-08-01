export const delay = (time: number) => new Promise((resolve, reject) => setTimeout(resolve, time));

export function formatToDateTime(d: Date): string {
  return new Intl.DateTimeFormat('id', {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export type IntersectionToUnion<T> = (T extends any ? (arg: T) => void : never) extends (arg: infer U) => void ? U : never;
