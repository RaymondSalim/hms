"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React from "react";
import {formatToDateTime} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {RoomsWithType} from "@/app/_db/room";
import {RoomForm} from "@/app/(internal)/rooms/all-rooms/form";
import {deleteRoomAction, upsertRoomAction} from "@/app/(internal)/rooms/all-rooms/room-actions";


export interface RoomsContentProps {
  rooms: RoomsWithType[]
}

export default function RoomsContent({rooms}: RoomsContentProps) {
  const columnHelper = createColumnHelper<RoomsWithType>();
  const columns = [
    columnHelper.accessor(row => row.id, {
      header: "ID",
      size: 20
    }),
    columnHelper.accessor(row => row.room_number, {
      header: "Room Number"
    }),
    columnHelper.accessor(row => row.roomtypes?.type, {
      header: "Room Type"
    }),
    columnHelper.accessor(row => row.roomstatuses?.status, {
      header: "Status",
    }),
    columnHelper.accessor(row => row.createdAt, {
      header: "Created At",
      cell: props => formatToDateTime(props.cell.getValue())
    }),
  ];

  return (
    <div className={"p-8"}>
      <TableContent<RoomsWithType>
        name={"Rooms"}
        initialContents={rooms}
        columns={columns}
        form={
          // @ts-ignore
          <RoomForm/>
        }
        searchPlaceholder={"Search by name or email address"}
        upsert={{
          mutationFn: upsertRoomAction,
        }}

        delete={{
          // @ts-ignore
          mutationFn: deleteRoomAction,
        }}
      />
    </div>
  );
}
