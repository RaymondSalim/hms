"use client";

import {useContext, useEffect} from "react";
import {HeaderContext} from "@/app/_context/HeaderContext";
import Link from "next/link";
import FinancialSummaryPage from "@/app/(internal)/(dashboard_layout)/financials/summary/content";

export default function Page() {
  const headerContext = useContext(HeaderContext);

  useEffect(() => {
    headerContext.setTitle("Ringakasan Keungan");
    headerContext.setPaths([
      <Link key={"financials"} href={"/financials"}>Keuangan</Link>,
      <Link key={"summary"} href={"/summary"}>Ringkasan</Link>
    ]);
  }, []);

  return (
    <FinancialSummaryPage />
  );
}
