"use server";

import prisma from "@/lib/primsa";
import {Prisma} from "@prisma/client";

// TODO! getUser should take an argument (ID)
export async function getUser() {
  return prisma.users.findFirst();
}

export type User = Prisma.PromiseReturnType<typeof getUser>;
