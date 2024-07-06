"use server";

import {SiteUser} from "@prisma/client";
import prisma from "@/app/_lib/primsa";


export async function getAllUsers(offset?: number, limit?: number): Promise<Omit<SiteUser, "password">[]> {
  return prisma.siteUser.findMany({
    omit: {
      password: true,
    },
    skip: offset,
    take: limit,
    include: {
      roles: true,
    }
  });
}

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
    include: {
      roles: true
    }
  });
}

export async function updateUser(id: string, user: Pick<SiteUser, "email" | "image" | "name" | "role_id">): Promise<SiteUser | null> {
  return prisma.siteUser.update({
    where: {
      id: id,
    },
    data: user,
    include: {
      roles: true,
    }
  });
}

export async function deleteUser(id: string) {
  return prisma.siteUser.delete({
    where: {
      id: id
    }
  });
}

export async function getAllRoles() {
  return prisma.role.findMany({
    orderBy: {
      id: 'asc'
    }
  });
}
