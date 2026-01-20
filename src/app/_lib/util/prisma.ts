import {Prisma} from "@prisma/client";

export function parsePrismaJson<T = Record<string, any>>(json: Prisma.JsonValue): T {
  return json as T;
}

export function serializeForClient<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (Prisma.Decimal.isDecimal?.(value) || value instanceof Prisma.Decimal) {
    return (value as Prisma.Decimal).toString() as T;
  }

  if (value instanceof Date) {
    return value.toISOString() as T;
  }

  if (Array.isArray(value)) {
    return value.map(item => serializeForClient(item)) as T;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(record)) {
      output[key] = serializeForClient(item);
    }
    return output as T;
  }

  return value;
}
