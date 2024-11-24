"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React from "react";
import {formatToDateTime} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {Duration} from "@prisma/client";
import {DurationForm} from "@/app/(internal)/(dashboard_layout)/rooms/durations/form";
import {
  deleteDurationAction,
  upsertDurationAction
} from "@/app/(internal)/(dashboard_layout)/rooms/durations/duration-actions";


interface ContentProps<T> {
  contents: T[]
}

export default function DurationsContent({contents}: ContentProps<Duration>) {
  const columnHelper = createColumnHelper<Duration>();
  const columns = [
    columnHelper.accessor(row => row.id, {
      header: "ID",
      size: 20
    }),
    columnHelper.accessor(row => row.duration, {
      header: "Durasi"
    }),
    columnHelper.accessor(row => row.month_count, {
      header: "Jumlah Bulan",
      cell: props => props.cell.getValue() ?? "-",
      enableGlobalFilter: false
    }),
    columnHelper.accessor(row => row.createdAt, {
      header: "Dibuat Pada",
      cell: props => formatToDateTime(props.cell.getValue()),
      enableGlobalFilter: false,
    }),
  ];

  return (
      <TableContent<typeof contents[0]>
        name={"Durasi"}
        initialContents={contents}
        columns={columns}
        form={
          // @ts-ignore
          <DurationForm/>
        }
        searchPlaceholder={"Cari dari durasi"}
        upsert={{
          mutationFn: upsertDurationAction,
        }}

        delete={{
          // @ts-ignore
          mutationFn: deleteDurationAction,
        }}
      />
  );
}
