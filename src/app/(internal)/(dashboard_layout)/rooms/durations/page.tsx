"use client";

import React, {useContext, useEffect} from "react";
import {HeaderContext} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";
import DurationsContent from "@/app/(internal)/(dashboard_layout)/rooms/durations/content";
import {getSortedDurations} from "@/app/_db/duration";

export default function RoomsPage() {
  const headerContext = useContext(HeaderContext);

  useEffect(() => {
    headerContext.setTitle("Durasi Sewa");
    headerContext.setShowLocationPicker(true);
    headerContext.setPaths([
      <Link key={"rooms"} href={"/rooms"}>Kamar</Link>,
      <Link key={"durations"} href={"/durations"}>Durasi Sewa</Link>,
    ]);
  }, []);

  const {data: durationsData, isSuccess, isLoading} = useQuery({
    queryKey: ['rooms.durations'],
    queryFn: () => getSortedDurations(),
  });


  return (
    <>
      {
        isLoading &&
          <span className={"mx-auto h-8 w-8"}><AiOutlineLoading className="animate-spin"/></span>
      }
      {
        isSuccess &&
          <DurationsContent contents={durationsData}/>
      }
    </>
  );
}
