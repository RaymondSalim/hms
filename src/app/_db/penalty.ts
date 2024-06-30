import {Penalty} from "@prisma/client";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import prisma from "@/app/_lib/primsa";

export async function getPenalties(id?: number, limit?: number, offset?: number) {
  return prisma.penalty.findMany({
    where: id ? { id } : undefined,
    skip: offset,
    take: limit,
  });
}

export async function createPenalty(penaltyData: OmitIDTypeAndTimestamp<Penalty>) {
  return prisma.penalty.create({
    data: {
      amount: penaltyData.amount,
      description: penaltyData.description,
      booking_id: penaltyData.booking_id,
    },
  });
}

export async function updatePenaltyByID(id: number, penaltyData: OmitIDTypeAndTimestamp<Penalty>) {
  return prisma.penalty.update({
    data: penaltyData,
    where: {
      id: id,
    },
  });
}

export async function deletePenalty(id: number) {
  return prisma.penalty.delete({
    where: {
      id: id,
    },
  });
}
