"use client";

import {useEffect} from "react";
import {useHeader} from "@/app/_context/HeaderContext";
import Link from "next/link";
import FinancialSummaryPage from "@/app/(internal)/(dashboard_layout)/financials/summary/content";

export default function Page() {
  const headerContext = useHeader();

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
