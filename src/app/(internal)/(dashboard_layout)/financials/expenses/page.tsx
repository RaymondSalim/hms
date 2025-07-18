"use client";

import {useHeader} from "@/app/_context/HeaderContext";
import React, {useEffect} from "react";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";
import {getTransactionsWithBookingInfo} from "@/app/_db/transaction";
import {TransactionType} from "@prisma/client";
import ExpensesContent from "@/app/(internal)/(dashboard_layout)/financials/expenses/content";

export default function ExpensePage() {
  const headerContext = useHeader();

  useEffect(() => {
    headerContext.setTitle("Semua Pengeluaran");
    headerContext.setShowLocationPicker(true);
    headerContext.setPaths([
      <Link key={"financials"} href={"/financials"}>Keuangan</Link>,
      <Link key={"expenses"} href={"/expenses"}>Pengeluaran</Link>,
    ]);
  }, []);

  const {
    data: expenses,
    isLoading,
    isSuccess,
    refetch
  } = useQuery({
    queryKey: ['expenses', 'location_id', headerContext.locationID],
    queryFn: () => getTransactionsWithBookingInfo({
      where: {
        location_id: headerContext.locationID,
        type: TransactionType.EXPENSE
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
          <ExpensesContent
              expenses={expenses}
              refetchFn={refetch}
          />
      }
    </>
  );
}
