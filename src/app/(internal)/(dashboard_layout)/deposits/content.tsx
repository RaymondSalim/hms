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
        columnHelper.accessor((row) => Number(row.amount), {
            header: "Jumlah",
            cell: props => formatToIDR(props.getValue())
        }),
        columnHelper.accessor("status", {header: "Status"}),
        columnHelper.accessor((row) => Number(row.refunded_amount) || 0, {
            header: "Jumlah Dikembalikan",
            cell: props => props.getValue() > 0 ? formatToIDR(props.getValue()) : ""
        }),
        columnHelper.accessor((row) => row.received_date, {
            header: "Diterima Pada",
            cell: props => props.getValue() ? new Date(props.getValue()!).toLocaleString() : ""
        }),
        columnHelper.accessor((row) => row.applied_at, {
            header: "Digunakan Pada",
            cell: props => props.getValue() ? new Date(props.getValue()!).toLocaleString() : ""
        }),
        columnHelper.accessor((row) => row.refunded_at, {
            header: "Dikembalikan Pada",
            cell: props => props.getValue() ? new Date(props.getValue()!).toLocaleString() : ""
        }),
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
