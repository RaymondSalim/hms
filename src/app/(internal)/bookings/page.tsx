"use client";

import {HeaderContext} from "@/app/_context/HeaderContext";
import React, {useContext, useEffect, useState} from "react";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {getAllBookingsAction} from "@/app/(internal)/bookings/booking-action";
import {AiOutlineLoading} from "react-icons/ai";
import BookingsContent from "@/app/(internal)/bookings/content";
import {useSearchParams} from "next/navigation";

export type BookingPageQueryParams = {
  roomTypeID?: number
  locationID?: number
}

export default function BookingPage() {
  const headerContext = useContext(HeaderContext);
  const [locationID, setLocationID] = useState(headerContext.locationID);
  const [queryParams, setQueryParams] = useState<BookingPageQueryParams>();
  const searchParams = useSearchParams();

  useEffect(() => {
    headerContext.setTitle("Semua Pemesanan");
    headerContext.setShowLocationPicker(true);
    headerContext.setPaths([
      <Link key={"bookings"} href={"/bookings"}>Pemesanan</Link>,
    ]);

    let bpqp: BookingPageQueryParams = {};
    let shouldUpdate = false;

    let lID = searchParams.get("location_id");
    if (lID && Number(lID) > 0) {
      bpqp.locationID = Number(lID);
      setLocationID(bpqp.locationID);
      shouldUpdate = true;
    }

    let rtID = searchParams.get("room_type_id");
    if (rtID && Number(rtID) > 0) {
      bpqp.roomTypeID = Number(rtID);
      shouldUpdate = true;
    }
    if (shouldUpdate) {
      setQueryParams(bpqp);
    }
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
              queryParams={queryParams}
              // @ts-expect-error bookings mismatch
              bookings={bookings}
          />
      }
    </>
  );
}
