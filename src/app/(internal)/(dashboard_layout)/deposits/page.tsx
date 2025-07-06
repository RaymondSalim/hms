"use client";

import {useHeader} from "@/app/_context/HeaderContext";
import React, {useEffect} from "react";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {getAllDepositsAction} from "./deposit-action";
import {AiOutlineLoading} from "react-icons/ai";
import DepositsContent from "./content";

export default function DepositsPage() {
  const headerContext = useHeader();

  useEffect(() => {
    headerContext.setTitle("Semua Deposit");
    headerContext.setShowLocationPicker(true);
    headerContext.setPaths([
      <Link key={"deposits"} href={"/deposits"}>Deposit</Link>,
    ]);
  }, []);

  const {
    data: deposits,
    isLoading,
    isSuccess
  } = useQuery({
    queryKey: ['deposits'],
    queryFn: () => getAllDepositsAction()
  });

  return (
    <>
      {isLoading && (
        <span className={"mx-auto h-8 w-8"}><AiOutlineLoading className="animate-spin" /></span>
      )}
      {isSuccess && (
        <DepositsContent initialDeposits={deposits} />
      )}
    </>
  );
}
