import type {Prisma} from "@prisma/client";

export function parsePrismaJson<T = Record<string, any>>(json: Prisma.JsonValue): T {
  return json as T;
}

