"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React from "react";
import {formatToDateTime} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {GuestWithTenant} from "@/app/_db/guest";
import {GuestForm} from "@/app/(internal)/(dashboard_layout)/residents/guests/form";
import {deleteGuestAction, upsertGuestAction} from "@/app/(internal)/(dashboard_layout)/residents/guests/guest-action";
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
      header: "Nama"
    }),
    columnHelper.accessor(row => row.email, {
      header: "Alamat Email"
    }),
    columnHelper.accessor(row => row.tenants.name, {
      header: "Tamu Dari",
      cell: props => {
        return (
          <Link href={{
            pathname: "/residents/tenants",
            query: {
              tenant_id: props.cell.row.original.tenant_id,
            }
          }}>{props.cell.getValue()}</Link>
        );
      }
    }),
    columnHelper.accessor(row => row.createdAt, {
      header: "Dibuat Pada",
      cell: props => formatToDateTime(props.cell.getValue())
    }),
  ];

  return (
      <TableContent<GuestWithTenant>
        name={"Tamu"}
        initialContents={guests}
        columns={columns}
        form={
          // @ts-ignore
          <GuestForm/>
        }
        searchPlaceholder={"Cari berdasarkan nama atau alamat"}
        upsert={{
          mutationFn: upsertGuestAction,
        }}

        delete={{
          // @ts-ignore
          mutationFn: deleteGuestAction,
        }}
      />
  );
}
