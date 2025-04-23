"use client";

import React, {useEffect, useState} from "react";
import {useHeader} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";
import {getRoomTypes} from "@/app/_db/room";
import RoomAvailabilityContent from "@/app/(internal)/(dashboard_layout)/rooms/availability/content";
import {getAllBookingsAction} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import {DateRange} from "react-day-picker";

export default function RoomsPage() {
    const headerContext = useHeader();

    useEffect(() => {
        headerContext.setTitle("Ketersediaan Kamar");
        headerContext.setShowLocationPicker(true);
        headerContext.setPaths([
            <Link key={"rooms"} href={"/rooms"}>Kamar</Link>,
            <Link key={"all"} href={"/availability"}>Ketersediaan Kamar</Link>,
        ]);
    }, []);

    const dateState = useState<DateRange | undefined>(undefined);

    const {data: roomTypeData, isSuccess: isSuccess, isLoading: isLoading} = useQuery({
        queryKey: ['rooms.type', 'location_id', headerContext.locationID],
        queryFn: () => getRoomTypes(headerContext.locationID),
    });

    const {data: bookings} = useQuery({
        queryKey: ['bookings', 'location_id', headerContext.locationID, 'date', dateState[0]],
        enabled: dateState[0] != undefined,
        queryFn: () => getAllBookingsAction(headerContext.locationID, undefined, {
            start_date: {
                lte: dateState[0]?.to,
            },
            end_date: {
                gte: dateState[0]?.from,
            }
        })
    });

    return (
        <>
            {
                isLoading &&
                <span className={"mx-auto h-8 w-8"}><AiOutlineLoading className="animate-spin"/></span>
            }
            {
                isSuccess &&
                <RoomAvailabilityContent
                    // @ts-expect-error ignore incorrect type
                    roomTypes={roomTypeData}
                    // @ts-expect-error ignore type incorrect
                    bookings={bookings}
                    dateState={dateState}
                    locationID={headerContext.locationID}
                />
            }
        </>
    );
}
