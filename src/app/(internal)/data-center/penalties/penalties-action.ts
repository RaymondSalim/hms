export async function createPenalty(description: string, amount: number, bookingId: number) {
  return prisma.penalty.create({
    data: {
      description,
      amount,
      booking_id: bookingId,
    },
  });
}

export async function getPenaltiesByBooking(bookingId: number) {
  return prisma.penalty.findMany({
    where: {booking_id: bookingId},
  });
}

export async function updatePenalty(id: number, description: string, amount: number) {
  return prisma.penalty.update({
    where: {id},
    data: {description, amount},
  });
}

export async function deletePenalty(id: number) {
  return prisma.penalty.delete({
    where: {id},
  });
}
