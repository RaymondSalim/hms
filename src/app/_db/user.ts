"use server";

import {User} from "@prisma/client";

export async function getUserByID(id: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: {
      id: id
    }
  });
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

export async function updateUser(id: string, user: Pick<User, "email" | "password" | "name" | "role_id">): Promise<User | null> {
  return prisma.user.update({
    where: {
      id: id,
    },
    data: user
  });
}
