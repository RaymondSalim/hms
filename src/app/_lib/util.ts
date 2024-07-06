export const delay = (time: number) => new Promise((resolve, reject) => setTimeout(resolve, time));

export function formatToDateTime(d: Date): string {
  return new Intl.DateTimeFormat('id', {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}
