"use client";

import {SiteUser} from "@prisma/client";
import {createColumnHelper} from "@tanstack/react-table";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {UserForm} from "@/app/(internal)/(dashboard_layout)/settings/users/form";
import {
  deleteUserAction,
  upsertSiteUserAction
} from "@/app/(internal)/(dashboard_layout)/settings/users/site_users-action";
import React from "react";
import {formatToDateTime} from "@/app/_lib/util";
import {useSession} from "next-auth/react";

export interface UsersContentProps {
  users: Omit<SiteUser, "password">[]
}

export default function UsersContent({users}: UsersContentProps) {
  const columnHelper = createColumnHelper<Omit<SiteUser, "password">>();
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
    // @ts-ignore
    columnHelper.accessor(row => row.roles.name, {
      header: "Peran"
    }),
    columnHelper.accessor(row => row.createdAt, {
      header: "Dibuat Pada",
      cell: props => formatToDateTime(props.cell.getValue())
    }),
  ];

  const {data: session, status} = useSession();

  return (
      <TableContent<Omit<SiteUser, "password">>
        name={"Pengguna Situs"}
        initialContents={users}
        columns={columns}
        form={
          // @ts-ignore
          <UserForm/>
        }
        searchPlaceholder={"Cari berdasarkan nama atau alamat email"}
        upsert={{
          mutationFn: upsertSiteUserAction,
        }}

        delete={{
          // @ts-ignore
          mutationFn: deleteUserAction,
        }}
        shouldShowRowAction={props => props.row.original.id != session?.user?.id}
      />
  );
}
