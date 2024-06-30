"use server";

import {SiteUser} from "@prisma/client";
import prisma from "@/app/_lib/primsa";

export async function getUserByID(id: string): Promise<SiteUser | null> {
  return prisma.siteUser.findFirst({
    where: {
      id: id
    }
  });
}

export async function findUserByEmail(email: string): Promise<SiteUser | null> {
  return prisma.siteUser.findFirst({
    where: {
      email: email
    }
  });
}

export async function createUser(user: Omit<SiteUser, "id" | "createdAt" | "updatedAt" | "emailVerified" | "image">): Promise<SiteUser | null> {
  return prisma.siteUser.create({
    data: user,
  });
}

export async function updateUser(id: string, user: Pick<SiteUser, "email" | "password" | "name" | "role_id">): Promise<SiteUser | null> {
  return prisma.siteUser.update({
    where: {
      id: id,
    },
    data: user
  });
}
