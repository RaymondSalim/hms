"use client";

import {useHeader} from "@/app/_context/HeaderContext";
import React, {use, useEffect, useState} from "react";
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
  q?: string,
  id?: string,
  room_number?: string,
  tenant?: string,
  status?: string
}

export default function BookingPage(props: {
  params?: Promise<any>,
  searchParams?: Promise<BookingPageQueryParams>,
}) {
  const searchParams = use(props.searchParams ?? Promise.resolve(undefined));
  const headerContext = useHeader();
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
              queryParams={searchParams}
              // @ts-expect-error bookings mismatch
              bookings={bookings}
          />
      }
    </>
  );
}
