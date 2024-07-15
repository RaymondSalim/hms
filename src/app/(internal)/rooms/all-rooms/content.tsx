"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React, {useContext} from "react";
import {formatToDateTime} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {RoomsWithTypeAndLocation} from "@/app/_db/room";
import {RoomForm} from "@/app/(internal)/rooms/all-rooms/form";
import {deleteRoomAction, upsertRoomAction} from "@/app/(internal)/rooms/all-rooms/room-actions";
import {HeaderContext} from "@/app/_context/HeaderContext";


export interface RoomsContentProps {
  rooms: RoomsWithTypeAndLocation[]
}

export default function RoomsContent({rooms}: RoomsContentProps) {
  const headerContext = useContext(HeaderContext);

  const columnHelper = createColumnHelper<RoomsWithTypeAndLocation>();
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

  if (!headerContext.locationID) {
    // @ts-ignore
    columns.splice(1, 0, columnHelper.accessor(row => row.locations?.name, {
        header: "Location",
        size: 20
      })
    );
  }

  return (
    <div className={"p-8"}>
      <TableContent<RoomsWithTypeAndLocation>
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
