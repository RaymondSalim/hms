"use client";

import {useHeader} from "@/app/_context/HeaderContext";
import React, {useEffect} from "react";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";
import {getTransactionsWithBookingInfoAction} from "@/app/(internal)/(dashboard_layout)/financials/transaction-action";
import {TransactionType} from "@prisma/client";
import IncomesContent from "@/app/(internal)/(dashboard_layout)/financials/incomes/content";

export default function IncomePage() {
  const headerContext = useHeader();

  useEffect(() => {
    headerContext.setTitle("Semua Pemasukan");
    headerContext.setShowLocationPicker(true);
    headerContext.setPaths([
      <Link key={"financials"} href={"/financials"}>Keuangan</Link>,
      <Link key={"incomes"} href={"/incomes"}>Pemasukan</Link>,
    ]);
  }, []);

  const {
    data: incomes,
    isLoading,
    isSuccess,
    refetch
  } = useQuery({
    queryKey: ['incomes', 'location_id', headerContext.locationID],
    queryFn: () => getTransactionsWithBookingInfoAction({
      where: {
        location_id: headerContext.locationID,
        type: TransactionType.INCOME
      },
      orderBy: {
        date: "desc"
      }
    })
  });

  return (
    <>
      {
        isLoading &&
          <span className={"mx-auto h-8 w-8"}><AiOutlineLoading className="animate-spin"/></span>
      }
      {
        isSuccess &&
          <IncomesContent
              incomes={incomes}
              refetchFn={refetch}
          />
      }
    </>
  );
}
