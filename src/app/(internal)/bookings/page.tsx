"use client";

import {HeaderContext} from "@/app/_context/HeaderContext";
import React, {useContext, useEffect} from "react";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {getAllBookings} from "@/app/(internal)/bookings/booking-action";
import {AiOutlineLoading} from "react-icons/ai";
import BookingsContent from "@/app/(internal)/bookings/content";

export default function BookingPage() {
  const headerContext = useContext(HeaderContext);

  useEffect(() => {
    headerContext.setTitle("All Bookings");
    headerContext.setShowLocationPicker(true);
    headerContext.setPaths([
      <Link key={"bookings"} href={"/bookings"}>Bookings</Link>,
    ]);
  }, []);

  const {
    data: bookings,
    isLoading,
    isSuccess
  } = useQuery({
    queryKey: ['bookings', headerContext.locationID],
    queryFn: () => getAllBookings(headerContext.locationID)
  });

  return (
    <>
      {
        isLoading &&
          <span className={"mx-auto h-8 w-8"}><AiOutlineLoading className="animate-spin"/></span>
      }
      {
        isSuccess &&
          <BookingsContent bookings={bookings}/>
      }
    </>
  );
}
