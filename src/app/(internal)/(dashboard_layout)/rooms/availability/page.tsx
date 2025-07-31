"use client";

import React, {useEffect} from "react";
import {useHeader} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";
import {getRoomTypes} from "@/app/_db/room";
import RoomAvailabilityContent from "@/app/(internal)/(dashboard_layout)/rooms/availability/content";

export default function RoomsPage() {
    const headerContext = useHeader();

    useEffect(() => {
        headerContext.setTitle("Ketersediaan Kamar");
        headerContext.setShowLocationPicker(true);
        headerContext.setPaths([
            <Link key={"rooms"} href={"/rooms"}>Kamar</Link>,
            <Link key={"all"} href={"/availability"}>Ketersediaan Kamar</Link>,
        ]);
    }, [headerContext]);

    const {data: roomTypeData, isSuccess: isSuccess, isLoading: isLoading} = useQuery({
        queryKey: ['rooms.type', 'location_id', headerContext.locationID],
        queryFn: () => getRoomTypes(headerContext.locationID),
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
                    roomTypes={roomTypeData}
                />
            }
        </>
    );
}
