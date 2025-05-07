"use client";

import {PropsWithChildren, useEffect} from "react";
import {useHeader} from "@/app/_context/HeaderContext";
import Link from "next/link";

export default function Layout({children}: PropsWithChildren) {
  const headerContext = useHeader();

  useEffect(() => {
    headerContext.setTitle("Lokasi Properti");
    headerContext.setShowLocationPicker(false);
    headerContext.setPaths([
      <Link key={"data-center"} href={"/src/app/(internal)/(dashboard_layout)/data-center"}>Pusat Data</Link>,
      <Link key={"location"} href={"/locations"}>Lokasi Properti</Link>
    ]);
  }, []);

  return (
    <>
      {children}
    </>
  );
}
