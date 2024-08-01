"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React, {useContext, useState} from "react";
import {addToDate, formatToDateTime} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {RoomForm} from "@/app/(internal)/rooms/all-rooms/form";
import {deleteRoomAction} from "@/app/(internal)/rooms/all-rooms/room-actions";
import {HeaderContext} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {BookingsIncludeAll} from "@/app/(internal)/bookings/booking-action";


export interface BookingsContentProps {
  bookings: BookingsIncludeAll[]
}

const colorMapping: Map<string, string> = new Map([
  ["default", "text-black"]
]);

export default function BookingsContent({bookings}: BookingsContentProps) {
  const headerContext = useContext(HeaderContext);
  const [activeData, setActiveData] = useState<BookingsIncludeAll | undefined>(undefined);
  const [showDialog, setShowDialog] = useState(false);

  const columnHelper = createColumnHelper<BookingsIncludeAll>();
  const columns = [
    columnHelper.accessor(row => row.id, {
      header: "ID",
      size: 20
    }),
    columnHelper.accessor(row => row.tenants, {
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
        return rowA.original.tenants?.name.localeCompare(rowB.original.tenants?.name ?? '') ?? 0;
      },
      filterFn: (row, columnId, filterValue) => {
        if (filterValue.length < 3) return false;
        return row.original.tenants?.name.includes(filterValue) ?? false;
      }

    }),
    columnHelper.accessor(row => row.bookingstatuses?.status, {
      header: "Status",
      cell: props => <span className={colorMapping.get(props.getValue() ?? "default")}>{props.getValue()}</span>
    }),
    columnHelper.accessor(row => row.rooms?.room_number, {
      header: "Room Number"
    }),
    columnHelper.accessor(row => formatToDateTime(row.check_in, false), {
      header: "Start Date"
    }),
    columnHelper.accessor(row => formatToDateTime(addToDate(row.check_in, row.durations?.day_count ?? 0, row.durations?.month_count ?? 0), false), {
      header: "End Date",
    }),
    columnHelper.accessor(row => row.fee, {
      header: "Fee"
    }),
    columnHelper.display({
      header: "Bills",
      cell: props =>
        <Link className={"text-blue-400"} type="button" href={{
          pathname: "/bills",
          query: {
            booking_id: props.cell.row.original.id,
          }
        }}>View Bills</Link>
    }),
  ];

  if (!headerContext.locationID) {
    // @ts-ignore
    columns.splice(1, 0, columnHelper.accessor(row => row.rooms.locations?.name, {
        header: "Location",
        size: 20
      })
    );
  }

  return (
    <div className={"p-8"}>
      <TableContent<BookingsIncludeAll>
        name={"Bookings"}
        initialContents={bookings}
        columns={columns}
        form={
          // @ts-ignore
          <RoomForm/> // TODO!
        }
        searchPlaceholder={"TODO!"} // TODO!
        upsert={{
          // TODO!
          // mutationFn: upsertRoomAction,
        }}

        delete={{
          // TODO!
          // @ts-ignore
          mutationFn: deleteRoomAction,
        }}
      />
    </div>
  );
}
