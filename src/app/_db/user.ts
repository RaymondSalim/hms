"use server";

import prismaClient from "@/app/_lib/primsa";
import {User} from "@prisma/client";

// TODO! getUser should take an argument (ID)
export async function getUser(): Promise<User | null> {
  return prismaClient.user.findFirst();
}

export async function findUserByEmail(email: string): Promise<User | null>  {
  return prismaClient.user.findFirst({
    where: {
      email: email
    }
  });
}
