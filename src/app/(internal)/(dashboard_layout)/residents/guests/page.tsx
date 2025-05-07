"use client";

import React, {useEffect} from "react";
import {getGuests} from "@/app/_db/guest";
import GuestsContent from "@/app/(internal)/(dashboard_layout)/residents/guests/content";
import {useHeader} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";

export default function GuestsPage() {
  const headerContext = useHeader();

  useEffect(() => {
    headerContext.setTitle("Tamu");
    headerContext.setShowLocationPicker(true);
    headerContext.setPaths([
      <Link key={"residents"} href={"/src/app/(internal)/(dashboard_layout)/residents"}>Data Penghuni</Link>,
      <Link key={"guests"} href={"/guests"}>Tamu</Link>
    ]);
  }, []);

  const {data: guests, isLoading, isSuccess} = useQuery({
    queryKey: ['guests', headerContext.locationID],
    queryFn: () => getGuests(undefined, headerContext.locationID),
  });

  return (
    <>
      {
        isLoading &&
          <span className={"mx-auto h-8 w-8"}><AiOutlineLoading className="animate-spin"/></span>
      }
      {
        isSuccess &&
          <GuestsContent guests={guests}/>
      }
    </>
  );
}
