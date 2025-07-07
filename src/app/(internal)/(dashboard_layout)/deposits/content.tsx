"use client";

import React, {useState} from "react";
import {createColumnHelper} from "@tanstack/react-table";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {Deposit, DepositStatus} from "@prisma/client";
import {deleteDepositAction, upsertDepositAction} from "./deposit-action";
import {formatToIDR} from "@/app/_lib/util";
import {DepositForm} from "./form";
import {toast} from "react-toastify";

// Extended type to include received date from transactions
type DepositWithReceivedDate = Deposit & {
    received_date?: Date;
};

export default function DepositsContent({initialDeposits}: { initialDeposits: DepositWithReceivedDate[] }) {
    const [statusChange, setStatusChange] = useState<{
        id: number;
        status: DepositStatus;
        refunded_amount?: string;
    } | null>(null);

    const handleUpsert = async (data: Partial<Deposit>) => {
        try {
            const result = await upsertDepositAction({
                id: data.id,
                booking_id: Number(data.booking_id),
                amount: data.amount!,
                status: data.status!,
                refunded_amount: data.refunded_amount,
            });
            return result;
        } catch (e: any) {
            toast.error(e.message || "Gagal menyimpan perubahan.");
            throw e;
        }
    };

    const handleDelete = async (data: any) => {
        try {
            const result = await deleteDepositAction(Number(data.id));
            return result;
        } catch (e: any) {
            toast.error(e.message || "Gagal menghapus deposit.");
            throw e;
        }
    };

    const columnHelper = createColumnHelper<DepositWithReceivedDate>();
    const columns = [
        columnHelper.accessor("id", {header: "ID"}),
        columnHelper.accessor("booking_id", {header: "ID Booking", cell: (v) => `#-${v.getValue()}`}),
        columnHelper.accessor((row) => formatToIDR(Number(row.amount)), {header: "Jumlah"}),
        columnHelper.accessor("status", {header: "Status"}),
        columnHelper.accessor((row) => formatToIDR(Number(row.refunded_amount)) ?? "", {header: "Jumlah Dikembalikan"}),
        columnHelper.accessor((row) => row.received_date ? new Date(row.received_date).toLocaleString() : "", {header: "Diterima Pada"}),
        columnHelper.accessor((row) => row.applied_at ? new Date(row.applied_at).toLocaleString() : "", {header: "Digunakan Pada"}),
        columnHelper.accessor((row) => row.refunded_at ? new Date(row.refunded_at).toLocaleString() : "", {header: "Dikembalikan Pada"}),
    ];

    return (
        <TableContent<DepositWithReceivedDate>
            name={"Deposit"}
            initialContents={initialDeposits}
            columns={columns}
            form={
                // @ts-expect-error missing props definition
                <DepositForm/>
            }
            searchType="default"
            upsert={{
                mutationFn: handleUpsert,
            }}
            delete={{
                mutationFn: handleDelete,
            }}
        />
    );
}
