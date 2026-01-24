"use client";

import {RoomTypeWithRoomCount} from "@/app/_db/room";
import React, {useMemo, useState} from "react";
import {
    Button,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    Checkbox,
    Chip,
    Menu,
    MenuHandler,
    MenuItem,
    MenuList,
    Typography
} from "@material-tailwind/react";
import {formatToDateTime} from "@/app/_lib/util";
import {DateRange} from "react-day-picker";
import {DatePicker} from "@/app/_components/DateRangePicker";
import {FaChevronDown} from "react-icons/fa";
import {RiErrorWarningLine} from "react-icons/ri";
import {BookingsIncludeAll} from "@/app/_db/bookings";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {
    getRoomTypeAvailabilityAction
} from "@/app/(internal)/(dashboard_layout)/rooms/availability/availability-action";
import {useHeader} from "@/app/_context/HeaderContext";

export interface RoomAvailabilityProps {
    roomTypes: RoomTypeWithRoomCount[]
}

type RoomTypeWithRoomCountAndAvailability = RoomTypeWithRoomCount & {
    roomLeft: number,
}

// TODO: This client-side calculation function is no longer used.
// The availability calculation is now performed on the server by `getRoomTypeAvailabilityAction` for better performance.
export function calculateRoomAvailability(
    roomTypes: RoomTypeWithRoomCount[],
    bookings?: BookingsIncludeAll[],
    dateRange?: DateRange
): RoomTypeWithRoomCountAndAvailability[] {
    return roomTypes.map((rt) => {
        const totalRooms = rt._count.rooms;

        const roomsBooked = bookings?.reduce((count, booking) => {
            if (booking.rooms?.room_type_id === rt.id) {
                if (dateRange?.from) {
                    const bookingStart = new Date(booking.start_date);
                    const rangeStart = new Date(dateRange.from);
                    rangeStart.setHours(0, 0, 0, 0);
                    const rangeEnd = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
                    rangeEnd.setHours(23, 59, 59, 999);

                    let hasOverlap;
                    if (booking.is_rolling && !booking.end_date) {
                        hasOverlap = bookingStart < rangeEnd;
                    } else {
                        const bookingEnd = new Date(booking.end_date!);
                        hasOverlap = bookingStart < rangeEnd && bookingEnd > rangeStart;
                    }

                    if (hasOverlap) {
                        return count + 1;
                    }
                } else {
                    return count + 1;
                }
            }
            return count;
        }, 0) || 0;

        const roomLeft = totalRooms - roomsBooked;

        return {
            ...rt,
            roomLeft,
        };
    });
}

export default function AvailabilityContent(props: RoomAvailabilityProps) {
    const today = new Date();
    const { locationID } = useHeader();
    const [dates, setDates] = useState<DateRange | undefined>(undefined);
    const [searchTriggered, setSearchTriggered] = useState(false);
    const [filteredRoomTypeIDs, setFilteredRoomTypeIDs] = useState<Set<number>>(new Set(props.roomTypes.map(rt => rt.id)));

    // TODO: This query now fetches pre-calculated availability from the server
    // instead of fetching all bookings and calculating on the client.
    const { data: roomTypesWithAvailability, isLoading, isSuccess } = useQuery({
        queryKey: ['roomAvailability', locationID, dates],
        queryFn: async () => {
            if (!dates?.from) return props.roomTypes.map(rt => ({ ...rt, roomLeft: rt._count.rooms }));
            return getRoomTypeAvailabilityAction(locationID, dates as { from: Date, to?: Date });
        },
        enabled: searchTriggered, // Only run the query when the user clicks search
    });



    const displayData = useMemo(() => {
        let data;
        if (isSuccess && roomTypesWithAvailability) {
            data = roomTypesWithAvailability;
        } else {
            data = props.roomTypes.map(rt => ({ ...rt, roomLeft: rt._count.rooms }));
        }

        // Filter by selected room types
        return data.filter(rt => filteredRoomTypeIDs.has(rt.id));
    }, [props.roomTypes, roomTypesWithAvailability, isSuccess, filteredRoomTypeIDs]);

     return (
        <div className="flex flex-col gap-y-4">
            <div className="flex flex-wrap md:flex-nowrap gap-4">
                <Menu
                    dismiss={{
                        itemPress: false,
                    }}
                >
                    <MenuHandler>
                        {/* @ts-expect-error weird react 19 types error */}
                        <Button
                            className={"basis-1/2 md:basis-auto md:flex-grow-0 !px-2 !md:px-4 flex-1 border-[#b0bec5] flex items-center justify-center gap-3"}
                            variant={"outlined"}
                        >
                            Tipe Kamar
                            <FaChevronDown/>
                        </Button>
                    </MenuHandler>
                    {/* @ts-expect-error weird react 19 types error */}
                    <MenuList>
                        {/* @ts-expect-error weird react 19 types error */}
                        <MenuItem key={"all-rt"} className="p-0">
                            <label
                                htmlFor={"all-rt"}
                                className="flex cursor-pointer items-center gap-2 p-2"
                            >
                                {/* @ts-expect-error weird react 19 types error */}
                                <Checkbox
                                    checked={filteredRoomTypeIDs.size == props.roomTypes.length}
                                    onChange={(e) => {
                                        let newSet = new Set<number>();
                                        if (e.target.checked) {
                                            props.roomTypes.forEach((rt) => {
                                                newSet.add(rt.id);
                                            });
                                        }
                                        setFilteredRoomTypeIDs(newSet);
                                    }}
                                    ripple={false}
                                    id={"all-rt"}
                                    containerProps={{className: "p-0"}}
                                    className="hover:before:content-none"/>
                                Semua Tipe
                            </label>
                        </MenuItem>
                        {props.roomTypes.map(rt => (
                            /* @ts-expect-error weird react 19 types error */
                            <MenuItem key={rt.id} className="p-0">
                                <label
                                    htmlFor={rt.id.toString()}
                                    className="flex cursor-pointer items-center gap-2 p-2"
                                >
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Checkbox
                                        checked={filteredRoomTypeIDs.has(rt.id)}
                                        onChange={(e) => {
                                            let newSet: Set<number>;
                                            if (e.target.checked) {
                                                newSet = new Set([...filteredRoomTypeIDs, rt.id]);
                                            } else {
                                                filteredRoomTypeIDs.delete(rt.id);
                                                newSet = new Set(filteredRoomTypeIDs);
                                            }
                                            setFilteredRoomTypeIDs(newSet);
                                        }}
                                        ripple={false}
                                        id={rt.id.toString()}
                                        containerProps={{className: "p-0"}}
                                        className="hover:before:content-none"/>
                                    {rt.type}
                                </label>
                            </MenuItem>
                        ))}
                    </MenuList>
                </Menu>
                <DatePicker
                    className="ml-auto"
                    mode="range"
                    placeholder="Pilih tanggal"
                    initialDate={{
                        range: dates
                    }}
                    onUpdate={(data) => {
                        if (data.range) {
                            setDates(data.range);
                            setSearchTriggered(true);
                        }
                    }}
                />
            </div>

            {searchTriggered && dates?.from && !isLoading && (
                <div className="mt-4 text-center">
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography color="blue-gray" className="text-sm">
                        Menampilkan ketersediaan untuk: {formatToDateTime(dates.from, false)}
                        {dates.to && dates.from.getTime() !== dates.to.getTime() &&
                            ` - ${formatToDateTime(dates.to, false)}`
                        }
                    </Typography>
                </div>
            )}

            <div className="mt-8">
                {(props.roomTypes.length == 0 || filteredRoomTypeIDs.size == 0) ?
                    <div className={"w-full flex gap-4 justify-center"}>
                        <div className={"w-1/2 min-w-[300px] text-center"}>
                            <RiErrorWarningLine color={"gray"} className={"w-14 h-14 mx-auto mb-4"}/>
                            {/* @ts-expect-error weird react 19 types error */}
                            <Typography color={"gray"}>
                                {props.roomTypes.length == 0 ?
                                    "Tidak ada kamar yang tersedia pada tanggal tersebut. Mohon pilih tanggal lain." :
                                    "Mohon pilih setidaknya satu tipe kamar."}
                            </Typography>
                        </div>
                    </div> : <></>}
            </div>
            <div className={"grid grid-flow-row gap-4 grid-cols-[repeat(auto-fill,minmax(250px,1fr))]"}>
                {displayData.map(rt => {
                    return (
                        /* @ts-expect-error weird react 19 types error */
                        <Card key={rt.id}
                              className="col-span-1 max-w-[26rem] min-w-[250px] shadow-lg transition-all hover:scale-[1.02]">
                             {/* @ts-expect-error weird react 19 types error */}
                             <CardHeader floated={false} color="blue-gray">
                                 <div
                                     className="to-bg-black-10 absolute inset-0 h-full w-full bg-gradient-to-tr from-transparent via-transparent to-black/60 "/>
                             </CardHeader>
                             {/* @ts-expect-error weird react 19 types error */}
                             <CardBody>
                                 <div className="mb-3 flex items-center justify-between">
                                     {/* @ts-expect-error weird react 19 types error */}
                                     <Typography variant="h5" color="blue-gray" className="font-medium">
                                         {rt.type}
                                     </Typography>
                                     <Chip
                                         color={searchTriggered ? (rt.roomLeft === 0 ? "red" : "green") : "blue-gray"}
                                         className="rounded-full"
                                         value={`${searchTriggered ? rt.roomLeft + '/' : ''}${rt._count.rooms}`}/>
                                 </div>
                                 {/* @ts-expect-error weird react 19 types error */}
                                 <Typography color="gray">
                                     {rt.description}
                                 </Typography>
                             </CardBody>
                             {/* @ts-expect-error weird react 19 types error */}
                             <CardFooter className="pt-3 mt-auto">
                                 <Link
                                     href={searchTriggered && dates != undefined ?
                                         {
                                             pathname: "/bookings",
                                             query: {
                                                 action: "create",
                                                 location_id: locationID,
                                                 room_type_id: rt.id
                                             }
                                         } : {}}
                                 >
                                     {/* @ts-expect-error weird react 19 types error */}
                                     <Button
                                         disabled={rt.roomLeft === 0 && searchTriggered}
                                         size="lg"
                                         fullWidth={true}
                                         onClick={() => {
                                             // Date selection is now handled by DatePicker
                                         }}
                                     >
                                         {!searchTriggered ? "Pilih Tanggal" : (rt.roomLeft === 0 ? "Habis" : "Reservasi")}
                                     </Button>
                                 </Link>
                             </CardFooter>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
