"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React, {useContext, useState} from "react";
import {formatToDateTime, formatToIDR} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {HeaderContext} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {
    checkInOutAction,
    deleteBookingAction,
    upsertBookingAction
} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import {BookingForm} from "@/app/(internal)/(dashboard_layout)/bookings/form";
import {Button} from "@material-tailwind/react";
import {TbDoorEnter, TbDoorExit} from "react-icons/tb";
import {useMutation} from "@tanstack/react-query";
import {CheckInOutType} from "@/app/(internal)/(dashboard_layout)/bookings/enum";
import {BookingsIncludeAll} from "@/app/_db/bookings";
import {usePathname, useRouter} from "next/navigation";
import {BookingPageQueryParams} from "@/app/(internal)/(dashboard_layout)/bookings/page";
import {Prisma} from "@prisma/client";
import {SelectOption} from "@/app/_components/input/select";


export interface BookingsContentProps {
    bookings: BookingsIncludeAll[]
    queryParams?: BookingPageQueryParams
}

const colorMapping: Map<string, string> = new Map([
    ["default", "text-black"]
]);

export default function BookingsContent({bookings, queryParams}: BookingsContentProps) {
    const headerContext = useContext(HeaderContext);

    const [newQueryParams, setNewQueryParams] = useState<typeof queryParams>(queryParams);
    const [bookingsState, setBookingsState] = useState<BookingsIncludeAll[]>(bookings);

    const columnHelper = createColumnHelper<BookingsIncludeAll>();
    const columns = [
        columnHelper.accessor(row => row.id, {
            id: "id",
            header: "ID",
            enableColumnFilter: true,
            size: 20,
        }),
        columnHelper.accessor(row => `${row.tenants?.name} | ${row.tenants?.phone}`, {
            id: "tenant",
            header: "Penyewa",
            enableColumnFilter: true,
            cell: props => {
                const data = props.row.original.tenants;
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
        }),
        columnHelper.accessor(row => row.bookingstatuses?.status, {
            id: "status",
            header: "Status",
            enableColumnFilter: true,
            cell: props => <span className={colorMapping.get(props.getValue() ?? "default")}>{props.getValue()}</span>
        }),
        columnHelper.accessor(row => row.rooms?.room_number, {
            id: "room_number",
            header: "Nomor Kamar",
            enableColumnFilter: true,
        }),
        columnHelper.accessor(row => formatToDateTime(row.start_date, false), {
            header: "Tanggal Mulai",
        }),
        columnHelper.accessor(row => formatToDateTime(row.end_date, false), {
            header: "Tanggal Selesai",
        }),
        columnHelper.accessor(row => formatToIDR(new Prisma.Decimal(row.fee).toNumber()), {
            id: "fee",
            header: "Biaya",
        }),
        columnHelper.display({
            header: "Tagihan",
            cell: props =>
                <Link className={"text-blue-400"} type="button" href={{
                    pathname: "/bills",
                    query: {
                        booking_id: props.cell.row.original.id,
                    }
                }}>Lihat Tagihan</Link>
        }),
    ];

    if (!headerContext.locationID) {
        // @ts-ignore
        columns.splice(1, 0, columnHelper.accessor(row => row.rooms?.locations?.name, {
                header: "Lokasi",
                enableColumnFilter: false,
                size: 20
            })
        );
    }

    const checkIncCheckOutMutation = useMutation({
        mutationFn: checkInOutAction,
        onSuccess: (data) => {
            if (data.success) { // TODO! Alert
                setBookingsState(prev => {
                    let bookingIndex = prev.findIndex(b => b.id == data.success!.booking_id);
                    if (bookingIndex >= 0) {
                        prev[bookingIndex].checkInOutLogs.push(data.success!);
                    }
                    return [...prev];
                });
            }
        }
    });

    const router = useRouter();
    const pathname = usePathname();
    const removeQueryParams = () => {
        router.replace(`${pathname}`);
        setNewQueryParams(undefined);
    };
    const filterKeys: SelectOption<string>[] = columns
        .filter(c => (
            c.enableColumnFilter && c.header && c.id
        ))
        .map(c => ({
            label: c.header!.toString(),
            value: c.id!,
        }));

    return (
            <TableContent<BookingsIncludeAll>
                name={"Pemesanan"}
                initialContents={bookingsState}
                columns={columns}
                form={
                    // @ts-ignore
                    <BookingForm/>
                }
                searchPlaceholder={"TODO!"} // TODO!
                upsert={{
                    // @ts-ignore
                    mutationFn: upsertBookingAction,
                }}

                delete={{
                    // @ts-ignore
                    mutationFn: deleteBookingAction,
                }}
                additionalActions={{
                    position: "before",
                    actions: [
                        {
                            generateButton: (rowData) => {
                                const checkInExists = rowData.checkInOutLogs?.find(l => l.event_type == CheckInOutType.CHECK_IN);

                                return (
                                    <Button
                                        key={`${rowData.id}_in`}
                                        size={"sm"}
                                        color="blue"
                                        className="flex items-center gap-2 w-fit"
                                        onClick={() => checkIncCheckOutMutation.mutate({
                                            booking_id: rowData.id,
                                            action: CheckInOutType.CHECK_IN
                                        })}
                                        disabled={!!checkInExists}
                                    >
                                        <TbDoorEnter className={"text-white h-5 w-5"}/>
                                        <span className={"text-white whitespace-nowrap"}>Check In</span>
                                    </Button>
                                );
                            },
                        },
                        {
                            generateButton: (rowData) => {
                                const checkInExists = rowData.checkInOutLogs?.some(l => l.event_type == CheckInOutType.CHECK_IN);
                                const checkOutExists = rowData.checkInOutLogs?.some(l => l.event_type == CheckInOutType.CHECK_OUT);

                                let disabled = !checkInExists || (checkInExists && checkOutExists);

                                return (
                                    <Button
                                        key={`${rowData.id}_out`}
                                        size={"sm"}
                                        color="red"
                                        className="flex items-center gap-2 w-fit"
                                        onClick={() => checkIncCheckOutMutation.mutate({
                                            booking_id: rowData.id,
                                            action: CheckInOutType.CHECK_OUT
                                        })}
                                        disabled={disabled}
                                    >
                                        <TbDoorExit className={"text-white h-5 w-5"}/>
                                        <span className={"text-white whitespace-nowrap"}>Check Out</span>
                                    </Button>
                                );
                            },
                        }
                    ]
                }}
                filterKeys={filterKeys}
                searchType="smart"
                queryParams={
                    (queryParams?.action == undefined || queryParams?.action == "search") ?
                        {
                            action: "search",
                            values: queryParams,
                        } : undefined
                    /*{
                        action: "create",
                        initialActiveContent: {...queryParams} as unknown as typeof bills[0]
                    }*/
                }
            />
    );
}
