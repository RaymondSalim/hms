"use client";

import React, {useContext, useEffect} from "react";
import {getGuests} from "@/app/_db/guest";
import GuestsContent from "@/app/(internal)/residents/guests/content";
import {HeaderContext} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";

interface GuestsPageProps {
  locationID?: number
}

export default function GuestsPage(props: GuestsPageProps) {
  const headerContext = useContext(HeaderContext);

  useEffect(() => {
    headerContext.setTitle("Guests");
    headerContext.setShowLocationPicker(true);
    headerContext.setPaths([
      <Link key={"residents"} href={"/residents"}>Residents</Link>,
      <Link key={"guests"} href={"/guests"}>Guests</Link>
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
