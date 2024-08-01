export const delay = (time: number) => new Promise((resolve, reject) => setTimeout(resolve, time));

export function formatToDateTime(d: Date, showTime = true): string {
  return new Intl.DateTimeFormat('id', {
    dateStyle: "medium",
    timeStyle: showTime ? "short" : undefined,
  }).format(d);
}

export type IntersectionToUnion<T> = (T extends any ? (arg: T) => void : never) extends (arg: infer U) => void ? U : never;

export function addToDate(date: Date, dayCount: number, monthCount: number) {
  date.setDate(date.getDate() + dayCount);
  date.setMonth(date.getMonth() + monthCount);
  return date;
}
