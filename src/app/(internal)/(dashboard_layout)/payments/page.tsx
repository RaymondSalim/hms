"use client";

import {HeaderContext} from "@/app/_context/HeaderContext";
import React, {useContext, useEffect} from "react";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";
import {getAllPayments} from "@/app/_db/payment";
import PaymentsContent from "@/app/(internal)/(dashboard_layout)/payments/content";

export default function PaymentPage() {
  const headerContext = useContext(HeaderContext);

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
          <PaymentsContent payments={payments}/>
      }
    </>
  );
}
