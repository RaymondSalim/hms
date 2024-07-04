"use client";

import {PropsWithChildren, useContext, useEffect} from "react";
import {HeaderContext} from "@/app/_context/HeaderContext";
import Link from "next/link";

export default function Layout({children}: PropsWithChildren) {
  const headerContext = useContext(HeaderContext);

  useEffect(() => {
    headerContext.setTitle("Locations");
    headerContext.setShowLocationPicker(false);
    headerContext.setPaths([
      <Link key={"data-center"} href={"/data-center"}>Data Center</Link>,
      <Link key={"location"} href={"/locations"}>Locations</Link>
    ]);
  }, []);

  return (
    <>
      {children}
    </>
  );
}
