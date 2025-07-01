"use client";

import React, {useEffect} from "react";
import {useHeader} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";
import {getRooms} from "@/app/_db/room";
import RoomsContent from "@/app/(internal)/(dashboard_layout)/rooms/all-rooms/content";

// Add a type for query params, similar to BookingPage
export type RoomsPageQueryParams = {
  action?: "search" | "create",
  id?: string,
  room_number?: string,
  type?: string,
  status?: string,
  location_id?: number
};

// Accept searchParams in props
export default function RoomsPage(props: {
  params?: any,
  searchParams?: RoomsPageQueryParams,
}) {
  const headerContext = useHeader();

  useEffect(() => {
    headerContext.setTitle("Semua Kamar");
    headerContext.setShowLocationPicker(true);
    headerContext.setPaths([
      <Link key={"rooms"} href={"/rooms"}>Kamar</Link>,
      <Link key={"all"} href={"/all"}>Semua Kamar</Link>,
    ]);
  }, []);

  const {data: rooms, isLoading, isSuccess} = useQuery({
    queryKey: ['rooms', headerContext.locationID],
    queryFn: () => getRooms(undefined, headerContext.locationID),
  });

  return (
    <>
      {
        isLoading &&
          <span className={"mx-auto h-8 w-8"}><AiOutlineLoading className="animate-spin"/></span>
      }
      {
        isSuccess &&
          <RoomsContent rooms={rooms} queryParams={props.searchParams} />
      }
    </>
  );
}
