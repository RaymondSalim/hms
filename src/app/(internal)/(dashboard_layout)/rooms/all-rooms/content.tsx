"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React, {useState} from "react";
import {formatToDateTime} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {RoomsWithTypeAndLocationAndBookings} from "@/app/_db/room";
import {RoomForm} from "@/app/(internal)/(dashboard_layout)/rooms/all-rooms/form";
import {deleteRoomAction, upsertRoomAction, getRoomsWithBookingsAction} from "@/app/(internal)/(dashboard_layout)/rooms/room-actions";
import {useHeader} from "@/app/_context/HeaderContext";
import {Button, Dialog, Typography} from "@material-tailwind/react";
import {useQuery} from "@tanstack/react-query";
import {getSortedDurations} from "@/app/_db/duration";
import Link from "next/link";
import {toast} from "react-toastify";
import {isBookingActive, getNextUpcomingBooking} from "@/app/_lib/util";


export interface RoomsContentProps {
  rooms: RoomsWithTypeAndLocationAndBookings[]
}

const detailsHeader = ["Duration", "Price"];

export default function RoomsContent({rooms}: RoomsContentProps) {
  const headerContext = useHeader();
  const [activeData, setActiveData] = useState<RoomsWithTypeAndLocationAndBookings | undefined>(undefined);
  const [showDialog, setShowDialog] = useState(false);

  const {data: durationsData, isSuccess, isLoading} = useQuery({
    queryKey: ['rooms.durations'],
    queryFn: () => getSortedDurations(),
  });

  const columnHelper = createColumnHelper<RoomsWithTypeAndLocationAndBookings>();
  const columns = [
    columnHelper.accessor(row => row.id, {
      header: "ID",
      size: 20
    }),
    columnHelper.accessor(row => row.room_number, {
      header: "Nomor Kamar"
    }),
    columnHelper.accessor(row => row.roomtypes?.type, {
      header: "Tipe Kamar"
    }),
    columnHelper.accessor(row => row.roomstatuses?.status, {
      header: "Status",
    }),
    columnHelper.display({
      header: "Status Pemesanan",
      cell: props => {
        const room = props.row.original;
        const activeBooking = room.bookings?.find(booking => isBookingActive(booking));
        const nextUpcomingBooking = getNextUpcomingBooking(room.bookings || []);
        
        if (activeBooking) {
          return (
            <div className="flex flex-col">
              <span className="text-green-600 font-medium">Sedang Dihuni</span>
              <Link 
                href={`/bookings?action=search&id=${activeBooking.id}`}
                className="text-blue-400 text-sm hover:underline"
              >
                {activeBooking.tenants?.name || 'Tanpa Nama'} - {activeBooking.durations?.duration}
              </Link>
            </div>
          );
        } else if (nextUpcomingBooking) {
          return (
            <div className="flex flex-col">
              <span className="text-orange-600 font-medium">Pemesanan Berikutnya</span>
              <Link 
                href={`/bookings?action=search&id=${nextUpcomingBooking.id}`}
                className="text-blue-400 text-sm hover:underline"
              >
                {nextUpcomingBooking.tenants?.name || 'Tanpa Nama'} - {nextUpcomingBooking.durations?.duration}
              </Link>
              <span className="text-gray-500 text-xs">
                Mulai: {formatToDateTime(nextUpcomingBooking.start_date, false)}
              </span>
            </div>
          );
        } else {
          return (
            <span className="text-gray-500">Tidak Ada Pemesanan</span>
          );
        }
      }
    }),
    columnHelper.display({
      header: "Harga",
      cell: props =>
        <Link className={"text-blue-400"} type="button" href="" onClick={() => {
          setActiveData(props.row.original);
          setShowDialog(true);
        }}>Rincian Harga</Link>
    }),

    columnHelper.accessor(row => row.createdAt, {
      header: "Dibuat Pada",
      cell: props => formatToDateTime(props.cell.getValue())
    }),
  ];

  if (!headerContext.locationID) {
    // @ts-ignore
    columns.splice(1, 0, columnHelper.accessor(row => row.locations?.name, {
        header: "Lokasi",
        size: 20
      })
    );
  }

  return (
      <TableContent<RoomsWithTypeAndLocationAndBookings>
        name={"Kamar"}
        initialContents={rooms}
        columns={columns}
        form={
          // @ts-ignore
          <RoomForm/>
        }
        searchPlaceholder={"Cari berdasarkan nama atau alamat email"}
        upsert={{
          // @ts-ignore - View-only column, form doesn't need booking data
          mutationFn: upsertRoomAction,
          customOnSuccess: (data, variables, context, setMutationResponse, setContentsState, setDialogOpen) => {
            setMutationResponse(data);
            let shouldCloseDialog = false;

            if (data.success) {
              let target = data.success;

              setContentsState(prevState => {
                let newArr = [...prevState];
                let found = false;
                newArr.forEach((value, arrIndex) => {
                  // Replace row
                  if (value.id == target?.id) {
                    found = true;
                    newArr[arrIndex] = target!;
                  }

                  // Replace rtd data
                  if (value.roomtypes?.id == target.roomtypes?.id) {
                    value.roomtypes = target.roomtypes;
                  }
                });

                if (!found) {
                  newArr.concat(target);
                }

                return newArr;
              });
              shouldCloseDialog = true;
            }

            if (shouldCloseDialog) {
              setDialogOpen(false);
              toast.success(`Aksi Berhasil!`);
            }
          }
        }}

        delete={{
          // @ts-ignore
          mutationFn: deleteRoomAction,
        }}
        customDialog={
          <Dialog
            open={showDialog}
            size={"md"}
            handler={() => setShowDialog(prev => !prev)}
            className={"p-8"}
          >
            <Typography variant="h5" color="black" className="mb-4">Rincian Harga</Typography>
            {
              activeData?.roomtypes?.roomtypedurations && isSuccess &&
                <table className="w-full min-w-max table-auto text-left">
                    <thead>
                    <tr>
                      {detailsHeader.map((el) => (
                        <th
                          key={el}
                          className="border-b border-blue-gray-100 bg-blue-gray-50 p-4"
                        >
                          <Typography
                            variant="small"
                            color="blue-gray"
                            className="font-normal leading-none opacity-70"
                          >
                            {el}
                          </Typography>
                        </th>
                      ))}
                    </tr>
                    </thead>
                    <tbody>
                    {durationsData.map((d, index, arr) => {
                      const isLast = index === arr.length - 1;
                      const classes = isLast ? "p-4" : "p-4 border-b border-blue-gray-50";

                      const mapping = activeData.roomtypes?.roomtypedurations.find(e => e.duration_id == d.id);
                      const hasPrice = mapping && mapping.suggested_price;

                      return (
                        <tr key={d.id}>
                          <td className={classes}>
                            <Typography
                              variant="small"
                              color="blue-gray"
                              className="font-normal"
                            >
                              {d.duration}
                            </Typography>
                          </td>
                          <td className={classes}>
                            <Typography
                              variant="small"
                              color={hasPrice ? "blue-gray" : "red"}
                              className="font-normal"
                            >
                              {
                                hasPrice ?
                                  `IDR ${mapping.suggested_price}` :
                                  'Not Set'
                              }
                            </Typography>
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                </table>
            }
            <div className={"flex gap-x-4 justify-end"}>
              <Button onClick={() => setShowDialog(false)} variant={"outlined"} className="mt-6">
                Close
              </Button>
            </div>
          </Dialog>
        }
      />
  );
}
