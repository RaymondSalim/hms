"use server";

import {User} from "@prisma/client";

// TODO! getUser should take an argument (ID)
export async function getUser(): Promise<User | null> {
  return prisma.user.findFirst();
}

export async function findUserByEmail(email: string): Promise<User | null>  {
  return prisma.user.findFirst({
    where: {
      email: email
    }
  });
}

export async function createUser(user: Omit<User, "id" | "createdAt" | "updatedAt" | "emailVerified" | "image" >): Promise<User | null> {
  return prisma.user.create({
    data: user,
  });
}
