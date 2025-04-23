"use client";

import {useHeader} from "@/app/_context/HeaderContext";
import React, {useEffect} from "react";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";
import {getAllPayments} from "@/app/_db/payment";
import PaymentsContent from "@/app/(internal)/(dashboard_layout)/payments/content";

export type PaymentPageQueryParams = {
  action?: "search",
  id?: string,
  booking_id?: string,
  tenant?: string,
  status?: string
}

export default function PaymentPage(props: {
  params?: any,
  searchParams?: PaymentPageQueryParams
}) {
  const headerContext = useHeader();

  useEffect(() => {
    headerContext.setTitle("Pembayaran");
    headerContext.setShowLocationPicker(true);
    headerContext.setPaths([
      <Link key={"payments"} href={"/payments"}>Pembayaran</Link>,
    ]);
  }, []);

  const {
    data: payments,
    isLoading,
    isSuccess
  } = useQuery({
    queryKey: ['payments', 'location_id', headerContext.locationID],
    queryFn: () => getAllPayments(undefined, headerContext.locationID)
  });

  return (
    <>
      {
        isLoading &&
          <span className={"mx-auto h-8 w-8"}><AiOutlineLoading className="animate-spin"/></span>
      }
      {
        isSuccess &&
        // @ts-ignore
          <PaymentsContent
              queryParams={props.searchParams}
              payments={payments}
          />
      }
    </>
  );
}
