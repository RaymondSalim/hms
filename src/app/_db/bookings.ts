"use server";

import prisma from "@/app/_lib/primsa";

export async function getBookingStatuses() {
  return prisma.bookingStatus.findMany({
    orderBy: {
      createdAt: "asc",
    }
  });
}
