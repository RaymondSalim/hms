"use client";

import {HeaderContext} from "@/app/_context/HeaderContext";
import React, {useContext, useEffect} from "react";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";
import BillsContent from "@/app/(internal)/bills/content";
import {getAllBillsWithBookingAndPaymentsAction} from "@/app/(internal)/bills/bill-action";

export default function BillPage() {
  const headerContext = useContext(HeaderContext);

  useEffect(() => {
    headerContext.setTitle("Semua Tagihan");
    headerContext.setShowLocationPicker(true);
    headerContext.setPaths([
      <Link key={"payments"} href={"/bills"}>Pembayaran</Link>,
    ]);
  }, []);

  const {
    data: bills,
    isLoading,
    isSuccess
  } = useQuery({
    queryKey: ['bills', 'location_id', headerContext.locationID],
    queryFn: () => getAllBillsWithBookingAndPaymentsAction(undefined, headerContext.locationID)
  });

  return (
    <>
      {
        isLoading &&
          <span className={"mx-auto h-8 w-8"}><AiOutlineLoading className="animate-spin"/></span>
      }
      {
        isSuccess &&
          // @ts-expect-error
          <BillsContent bills={bills}/>
      }
    </>
  );
}
