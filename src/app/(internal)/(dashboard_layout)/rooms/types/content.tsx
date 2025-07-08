"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React from "react";
import {formatToDateTime} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {RoomType} from "@prisma/client";
import {RoomTypesForm} from "@/app/(internal)/(dashboard_layout)/rooms/types/form";
import {
  deleteRoomTypeAction,
  upsertRoomTypeAction
} from "@/app/(internal)/(dashboard_layout)/rooms/types/room-type-actions";


export interface RoomTypesContentProps {
  types: RoomType[]
}

export default function RoomTypesContent({types}: RoomTypesContentProps) {
  const columnHelper = createColumnHelper<RoomType>();
  const columns = [
    columnHelper.accessor(row => row.id, {
      header: "ID",
      size: 20
    }),
    columnHelper.accessor(row => row.type, {
      header: "Tipe"
    }),
    columnHelper.accessor(row => row.description, {
      header: "Deskripsi",
    }),
    columnHelper.accessor(row => row.createdAt, {
      header: "Dibuat Pada",
      cell: props => formatToDateTime(props.cell.getValue()),
      meta: {
        hidden: true,
      }
    }),
  ];

  return (
      <TableContent<RoomType>
        name={"Tipe Kamar"}
        initialContents={types}
        columns={columns}
        form={
          // @ts-ignore
          <RoomTypesForm/>
        }
        searchPlaceholder={"Search by type"}
        upsert={{
          mutationFn: upsertRoomTypeAction,
        }}

        delete={{
          // @ts-ignore
          mutationFn: deleteRoomTypeAction,
        }}
      />
  );
}
