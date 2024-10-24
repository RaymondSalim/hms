"use client";

import React, {useContext, useEffect} from "react";
import {HeaderContext} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";
import {getRoomTypes} from "@/app/_db/room";
import RoomTypesContent from "@/app/(internal)/rooms/types/content";

export default function RoomsPage() {
  const headerContext = useContext(HeaderContext);

  useEffect(() => {
    headerContext.setTitle("Room Types");
    headerContext.setShowLocationPicker(true);
    headerContext.setPaths([
      <Link key={"rooms"} href={"/rooms"}>Kamar</Link>,
      <Link key={"all"} href={"/types"}>Tipe</Link>,
    ]);
  }, []);

  const {data: roomTypeData, isSuccess, isLoading} = useQuery({
    queryKey: ['rooms.type'],
    queryFn: () => getRoomTypes(),
  });


  return (
    <>
      {
        isLoading &&
          <span className={"mx-auto h-8 w-8"}><AiOutlineLoading className="animate-spin"/></span>
      }
      {
        isSuccess &&
          <RoomTypesContent types={roomTypeData}/>
      }

    </>
  );
}
