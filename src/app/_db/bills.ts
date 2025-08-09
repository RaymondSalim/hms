import {Bill, Booking, Prisma} from "@prisma/client";
import prisma from "@/app/_lib/primsa";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";


const includePayments: Prisma.BillInclude = {
  paymentBills: {
    include: {
      payment: true
    }
  }
};

const billIncludesPayment = Prisma.validator<Prisma.BillDefaultArgs>()({
  include: includePayments
});

export type BillIncludePayment = Prisma.BillGetPayload<typeof billIncludesPayment> & {
  sumPaidAmount: Prisma.Decimal
}

const includeBooking: Prisma.BillInclude = {
  bookings: {
    include: {
      rooms: true
    }
  }
};

const billIncludeBooking = Prisma.validator<Prisma.BillDefaultArgs>()({
  include: includeBooking
}) ;

export type BillIncludeBooking = Prisma.BillGetPayload<typeof billIncludeBooking> & {
  bookings: Booking & {
    custom_id: string
  }
}

const billIncludeBookingAndPayments = Prisma.validator<Prisma.BillDefaultArgs>()({
  include: {
    bookings: {
      include: {
        rooms: true
      }
    },
    paymentBills: {
      include: {
        payment: true
      }
    }
  }
});

export type BillIncludeBookingAndPayments = Prisma.BillGetPayload<typeof billIncludeBookingAndPayments> & {
  bookings: Booking & {
    custom_id: string
  }
}

export const billIncludeBillItem = Prisma.validator<Prisma.BillDefaultArgs>()({
  include: {
    bill_item: true
  }
});

export type BillIncludeBillItem = Prisma.BillGetPayload<typeof billIncludeBillItem>

export const billIncludeAll = Prisma.validator<Prisma.BillDefaultArgs>()({
  include: {
    bookings: {
      include: {
        rooms: {
          include: {
            locations: true,
          }
        },
        tenants: true,
        deposit: true,
      }
    },
    paymentBills: {
      include: {
        payment: true
      }
    },
    bill_item: true
  }
});

export type BillIncludeAll = Prisma.BillGetPayload<typeof billIncludeAll> & {
  bookings: Booking & {
    custom_id: string
  }
  sumPaidAmount: Prisma.Decimal
}

export async function getBillsWithPayments(booking_id?: Prisma.IntFilter<"Bill"> | number, args?: Prisma.BillFindManyArgs) {
  return prisma.bill.findMany({
    ...args,
    where: {
      ...args?.where,
      booking_id: booking_id,
    },
    include: {
      ...args?.include,
      ...includePayments
    },
    orderBy: args?.orderBy ?? { due_date: 'desc' },
  });
}

export async function getAllBillsWithBooking(id?: Prisma.IntFilter<"Bill"> | number, args?: Prisma.BillFindManyArgs) {
  return prisma.bill.findMany({
    ...args,
    where: {
      ...args?.where,
      id: id,
    },
    include: {
      ...args?.include,
      bookings: {
        include: {
          // @ts-expect-error weird error
          ...args?.include?.bookings?.include,
          rooms: {
            include: {
              locations: true
            }
          }
        }
      }
    }
  }).then(b => b.map(nb => {
    return {
      ...nb,
      bookings: {
        ...nb.bookings,
        custom_id: `#-${nb.bookings.id}`
      }
    };
  }));
}

export async function updateBillByID(id: number, bill: OmitIDTypeAndTimestamp<Bill>, trx?: Prisma.TransactionClient) {
  let pc = trx ?? prisma;
  return pc.bill.update({
    where: {
      id
    },
    data: {
      ...bill,
      id: undefined,
    },
    include: {
      bookings: true
    }
  }).then(b => ({
    ...b,
    bookings: {
      ...b.bookings,
      custom_id: `#-${b.bookings.id}`
    }
  }));
}

export async function createBill(bill: OmitIDTypeAndTimestamp<Bill>) {
  return prisma.bill.create({
    data: {
      ...bill
    },
    include: billIncludeAll.include
  }).then(b => ({
    ...b,
    bookings: {
      ...b.bookings,
      custom_id: `#-${b.bookings.id}`
    }
  }));
}
