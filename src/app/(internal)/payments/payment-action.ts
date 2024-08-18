"use server";

import {createPayment, deletePayment, getPaymentStatus, updatePaymentByID} from "@/app/_db/payment";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import {Booking} from "@prisma/client";
import {number, object} from "zod";
import {paymentSchema} from "@/app/_lib/zod/payment/zod";
import {getBookingByIDAction} from "@/app/(internal)/bookings/booking-action";
import prisma from "@/app/_lib/primsa";
import {updateBillsPaidAmountByBalance} from "@/app/(internal)/payments/bill-action";

export async function upsertPaymentAction(reqData: OmitIDTypeAndTimestamp<Booking>) {
  const {success, data, error} = paymentSchema.safeParse(reqData);

  if (!success) {
    return {
      errors: error?.format()
    };
  }

  const booking = getBookingByIDAction(data?.booking_id);

  if (!booking) {
    return {
      failure: "Booking not found"
    };
  }

  prisma.$transaction(async (tx) => {
    // Bills
    const updatedData = await updateBillsPaidAmountByBalance(data.amount, data.booking_id, tx);

    if (updatedData.balance != 0) {
      throw new Error("Balance is not zero");
    }

    // TODO! Deal with bills when updating payments
    try {
      let res;

      if (data?.id) {
        // @ts-expect-error number and Prisma.Decimal types
        res = await updatePaymentByID(data.id, data);
      } else {
        res = await createPayment(data);
      }
    } catch (error) {

    }
  });
}

export async function deleteBookingAction(id: number) {
  const parsedData = object({id: number().positive()}).safeParse({
    id: id,
  });

  if (!parsedData.success) {
    return {
      errors: parsedData.error.format()
    };
  }

  try {
    let res = await deletePayment(parsedData.data.id);

    return {
      success: res,
    };
  } catch (error) {
    console.error(error);
    return {
      failure: "Error deleting payment",
    };
  }

}

export async function getPaymentStatusAction() {
  return getPaymentStatus();
}
