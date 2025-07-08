"use client";

import React, {useEffect} from "react";
import {useHeader} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";
import {getRoomsWithBookingsAction} from "@/app/(internal)/(dashboard_layout)/rooms/room-actions";
import RoomsContent from "@/app/(internal)/(dashboard_layout)/rooms/all-rooms/content";

export default function RoomsPage() {
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
    queryFn: () => getRoomsWithBookingsAction(headerContext.locationID),
  });

  return (
    <>
      {
        isLoading &&
          <span className={"mx-auto h-8 w-8"}><AiOutlineLoading className="animate-spin"/></span>
      }
      {
        isSuccess &&
          <RoomsContent rooms={rooms}/>
      }
    </>
  );
}
