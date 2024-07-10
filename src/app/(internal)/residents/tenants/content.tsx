"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React from "react";
import {formatToDateTime} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {TenantWithRooms} from "@/app/_db/tenant";
import {TenantForm} from "@/app/(internal)/residents/tenants/form";
import {deleteTenantAction, upsertTenantAction} from "@/app/(internal)/residents/tenants/tenant-action";
import Link from "next/link";
import {useSearchParams} from "next/navigation";


export interface TenantsContentProps {
  tenants: TenantWithRooms[]
}

export default function TenantsContent({tenants}: TenantsContentProps) {
  const columnHelper = createColumnHelper<TenantWithRooms>();
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
    columnHelper.accessor(row => row.bookings.length, {
      header: "Bookings",
      cell: props => {
        return (
          <Link href={{
            pathname: "/bookings",
            query: {
              tenant_id: props.cell.row.original.id,
            }
          }}>{props.cell.getValue()} bookings</Link>
        );
      }
    }),
    columnHelper.accessor(row => row.createdAt, {
      header: "Created At",
      cell: props => formatToDateTime(props.cell.getValue())
    }),
  ];

  const query = useSearchParams();

  return (
    <div className={"p-8"}>
      <TableContent<TenantWithRooms>
        name={"Tenants"}
        initialContents={tenants}
        initialSearchValue={query.get("tenant_id") ?? undefined}
        columns={columns}
        form={
          // @ts-ignore
          <TenantForm/>
        }
        searchPlaceholder={"Search by name or email address"}
        upsert={{
          mutationFn: upsertTenantAction,
        }}

        delete={{
          // @ts-ignore
          mutationFn: deleteTenantAction,
        }}
      />
    </div>
  );
}
