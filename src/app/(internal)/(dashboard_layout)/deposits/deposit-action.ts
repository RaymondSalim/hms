"use server";

import {Deposit, DepositStatus, Prisma} from "@prisma/client";
import {number, object} from "zod";
import {createDeposit, deleteDeposit, getAllDeposits, updateDeposit, updateDepositStatus,} from "@/app/_db/deposit";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {GenericActionsType} from "@/app/_lib/actions";
import {depositSchema, updateDepositStatusSchema} from "@/app/_lib/zod/deposit/zod";
import prisma from "@/app/_lib/primsa";
import {after} from "next/server";
import {serverLogger} from "@/app/_lib/axiom/server";

export type UpsertDepositPayload = {
    id?: number;
    booking_id: number;
    amount: Prisma.Decimal | string | number;
    status: DepositStatus;
    refunded_amount?: Prisma.Decimal | string | number | null;
};

export async function upsertDepositAction(reqData: UpsertDepositPayload): Promise<GenericActionsType<Deposit>> {
    after(() => {
        serverLogger.flush();
    });
    const {success, data, error} = depositSchema.safeParse(reqData);

    if (!success) {
        return {
            errors: error.format() as any,
        };
    }

    try {
        let res;

        if (data.id) {
            // Update existing deposit - don't allow booking_id to change
            const existingDeposit = await prisma.deposit.findUnique({
                where: {id: data.id}
            });

            if (!existingDeposit) {
                return {failure: "Deposit tidak ditemukan"};
            }

            // Use the original booking_id from the database
            res = await updateDeposit({
                id: data.id,
                booking_id: existingDeposit.booking_id, // Keep original booking_id
                amount: new Prisma.Decimal(data.amount),
                status: data.status,
            });
        } else {
            // Create new deposit
            res = await createDeposit({
                booking_id: data.booking_id,
                amount: new Prisma.Decimal(data.amount),
                status: data.status,
            });
        }

        return {
            success: res
        };
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
            serverLogger.error("[upsertDepositAction][PrismaKnownError]", {error});
            if (error.code === "P2002") {
                return {failure: "Deposit untuk booking ini sudah ada"};
            }
            if (error.code === "P2003") {
                return {failure: "ID booking tidak valid"};
            }
        } else if (error instanceof PrismaClientUnknownRequestError) {
            serverLogger.error("[upsertDepositAction][PrismaUnknownError]", {error});
        } else {
            serverLogger.error("[upsertDepositAction]", {error});
        }

        return {failure: "Permintaan tidak berhasil"};
    }
}

export async function getAllDepositsAction() {
    after(() => {
        serverLogger.flush();
    });
    try {
        return await getAllDeposits();
    } catch (error) {
        serverLogger.error("[getAllDepositsAction]", {error});
        throw error;
    }
}

export async function deleteDepositAction(id: number): Promise<GenericActionsType<Deposit>> {
    after(() => {
        serverLogger.flush();
    });
    const parsedData = object({id: number().positive()}).safeParse({id});

    if (!parsedData.success) {
        return {
            errors: parsedData.error.format()
        };
    }

    try {
        const res = await deleteDeposit(parsedData.data.id);
        return {
            success: res,
        };
    } catch (error) {
        serverLogger.error("[deleteDepositAction]", {error, deposit_id: id});
        return {
            failure: "Gagal menghapus deposit",
        };
    }
}

export async function updateDepositStatusAction(data: {
    depositId: number;
    newStatus: DepositStatus;
    refundedAmount?: Prisma.Decimal | number;
}): Promise<GenericActionsType<Deposit>> {
    after(() => {
        serverLogger.flush();
    });
    const validation = updateDepositStatusSchema.safeParse({
        id: data.depositId,
        status: data.newStatus,
        refunded_amount: data.refundedAmount
    });

    if (!validation.success) {
        return {
            errors: validation.error.format() as any
        };
    }

    try {
        const updatedDeposit = await updateDepositStatus({
            depositId: data.depositId,
            newStatus: data.newStatus,
            refundedAmount: data.refundedAmount,
        });

        return {
            success: updatedDeposit
        };
    } catch (error) {
        serverLogger.error("[updateDepositStatusAction]", {error});
        return {
            failure: error instanceof Error ? error.message : "Gagal memperbarui status deposit"
        };
    }
}
