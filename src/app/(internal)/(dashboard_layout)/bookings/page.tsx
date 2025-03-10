"use client";

import {HeaderContext} from "@/app/_context/HeaderContext";
import React, {useContext, useEffect, useState} from "react";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {getAllBookingsAction} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import {AiOutlineLoading} from "react-icons/ai";
import BookingsContent from "@/app/(internal)/(dashboard_layout)/bookings/content";

export type BookingPageQueryParams = {
  action: "create",
  room_type_id?: number
  location_id?: number
} | {
  action: "search";
  id?: string,
  room_number?: string,
  tenant?: string,
  status?: string
}

export default function BookingPage(props: {
  params?: any,
  searchParams?: BookingPageQueryParams,
}) {
  const headerContext = useContext(HeaderContext);
  const [locationID, setLocationID] = useState(headerContext.locationID);

  useEffect(() => {
    headerContext.setTitle("Semua Pemesanan");
    headerContext.setShowLocationPicker(true);
    headerContext.setPaths([
      <Link key={"bookings"} href={"/bookings"}>Pemesanan</Link>,
    ]);
  }, []);

  const {
    data: bookings,
    isLoading,
    isSuccess
  } = useQuery({
    queryKey: ['bookings', 'location_id', locationID],
    queryFn: () => getAllBookingsAction(locationID)
  });

  return (
    <>
      {
        isLoading &&
          <span className={"mx-auto h-8 w-8"}><AiOutlineLoading className="animate-spin"/></span>
      }
      {
        isSuccess &&
          <BookingsContent
              queryParams={props.searchParams}
              // @ts-expect-error bookings mismatch
              bookings={bookings}
          />
      }
    </>
  );
}
