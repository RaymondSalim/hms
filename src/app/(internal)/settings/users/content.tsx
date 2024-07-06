"use client";

import {SiteUser} from "@prisma/client";
import {createColumnHelper} from "@tanstack/react-table";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {UserForm} from "@/app/(internal)/settings/users/form";
import {deleteUserAction, upsertSiteUserAction} from "@/app/(internal)/settings/users/site_users-action";
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
      header: "Name"
    }),
    columnHelper.accessor(row => row.email, {
      header: "Email Address"
    }),
    // @ts-ignore
    columnHelper.accessor(row => row.roles.name, {
      header: "Role"
    }),
    columnHelper.accessor(row => row.createdAt, {
      header: "Created At",
      cell: props => formatToDateTime(props.cell.getValue())
    }),
  ];

  const {data: session, status} = useSession();

  return (
    <div className={"p-8"}>
      <TableContent<Omit<SiteUser, "password">>
        name={"User"}
        initialContents={users}
        columns={columns}
        form={
          // @ts-ignore
          <UserForm/>
        }
        searchPlaceholder={"Search by name or email address"}
        upsert={{
          mutationFn: upsertSiteUserAction,
        }}

        delete={{
          // @ts-ignore
          mutationFn: deleteUserAction,
        }}
        shouldShowRowAction={props => props.row.original.id != session?.user?.id}
      />
    </div>
  );
}
