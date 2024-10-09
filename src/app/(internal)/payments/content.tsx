"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React, {useContext, useState} from "react";
import {formatToDateTime, formatToIDR} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {HeaderContext} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {PaymentForm} from "@/app/(internal)/payments/form";
import {PaymentIncludeAll} from "@/app/_db/payment";
import {deletePaymentAction, upsertPaymentAction} from "@/app/(internal)/payments/payment-action";
import {Prisma} from "@prisma/client";


export interface PaymentsContentProps {
  payments: PaymentIncludeAll[]
}

const colorMapping: Map<string, string> = new Map([
  ["default", "text-black"]
]);

export default function PaymentsContent({payments}: PaymentsContentProps) {
  const headerContext = useContext(HeaderContext);
  const [dataState, setDataState] = useState<typeof payments>(payments);

  const columnHelper = createColumnHelper<typeof payments[0]>();
  const columns = [
    columnHelper.accessor(row => row.id, {
      header: "ID",
      size: 20
    }),
    columnHelper.accessor(row => row.bookings.custom_id ?? row.bookings.id, {
      header: "Booking ID",
      size: 20
    }),
    columnHelper.accessor(row => row.bookings.tenants, {
      header: "Tenant",
      cell: props => {
        const data = props.getValue();
        return ( // TODO! Make link
          <div className={"flex flex-col gap-y-1"}>
            <span>{data?.name}</span>
            <span>{data?.phone}</span>
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        return rowA.original.bookings.tenants?.name.localeCompare(rowB.original.bookings.tenants?.name ?? '') ?? 0;
      },
      filterFn: (row, columnId, filterValue) => {
        if (filterValue.length < 3) return false;
        return row.original.bookings.tenants?.name.includes(filterValue) ?? false;
      }

    }),
    columnHelper.accessor(row => row.paymentstatuses?.status, {
      header: "Status",
      cell: props => <span className={colorMapping.get(props.getValue() ?? "default")}>{props.getValue()}</span>
    }),
    columnHelper.accessor(row => formatToIDR(new Prisma.Decimal(row.amount).toNumber()), {
      header: "Paid Amount"
    }),
    columnHelper.accessor(row => formatToDateTime(row.payment_date, true, true), {
      header: "Payment Date"
    }),
    columnHelper.display({
      header: "Payment Proof",
      cell: props =>
        props.row.original.payment_proof ?
          <Link className={"text-blue-400"} type="proof" href={{
            pathname: `/s3/${props.row.original.payment_proof}`,
          }}>View Proof</Link> :
          <></>
    })

  ];

  if (!headerContext.locationID) {
    // @ts-expect-error // TODO!
    columns.splice(1, 0, columnHelper.accessor(row => row.rooms.locations?.name, {
        header: "Location",
        size: 20
      })
    );
  }

  return (
    <div className={"p-8"}>
      <TableContent<typeof payments[0]>
        name={"Bookings"}
        initialContents={dataState}
        columns={columns}
        form={
          // @ts-expect-error
          <PaymentForm/>
        }
        searchPlaceholder={"TODO!"} // TODO!
        upsert={{
          // @ts-expect-error
          mutationFn: upsertPaymentAction,
        }}

        delete={{
          // TODO!
          // @ts-expect-error
          mutationFn: deletePaymentAction,
        }}
      />
    </div>
  );
}
