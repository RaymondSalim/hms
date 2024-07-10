"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React from "react";
import {formatToDateTime} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {GuestWithTenant} from "@/app/_db/guest";
import {GuestForm} from "@/app/(internal)/residents/guests/form";
import {deleteGuestAction, upsertGuestAction} from "@/app/(internal)/residents/guests/guest-action";
import Link from "next/link";


export interface GuestsContentProps {
  guests: GuestWithTenant[]
}

export default function GuestsContent({guests}: GuestsContentProps) {
  const columnHelper = createColumnHelper<GuestWithTenant>();
  const columns = [
    columnHelper.accessor(row => row.id, {
      header: "ID",
      size: 20
    }),
    columnHelper.accessor(row => row.name, {
      header: "Name"
    }),
    columnHelper.accessor(row => row.email, {
      header: "Email Address"
    }),
    columnHelper.accessor(row => row.tenants.name, {
      header: "Guest of",
      cell: props => {
        return (
          <Link href={{
            pathname: "/residents/tenants",
            query: {
              tenant_id: props.cell.row.original.tenant_id,
            }
          }}>{props.cell.getValue()}</Link>
        )
      }
    }),
    columnHelper.accessor(row => row.createdAt, {
      header: "Created At",
      cell: props => formatToDateTime(props.cell.getValue())
    }),
  ];

  return (
    <div className={"p-8"}>
      <TableContent<GuestWithTenant>
        name={"Guests"}
        initialContents={guests}
        columns={columns}
        form={
          // @ts-ignore
          <GuestForm/>
        }
        searchPlaceholder={"Search by name or email address"}
        upsert={{
          mutationFn: upsertGuestAction,
        }}

        delete={{
          // @ts-ignore
          mutationFn: deleteGuestAction,
        }}
      />
    </div>
  );
}
