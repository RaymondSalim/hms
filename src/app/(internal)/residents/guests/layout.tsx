"use client";

import {PropsWithChildren, useContext, useEffect} from "react";
import {HeaderContext} from "@/app/_context/HeaderContext";
import Link from "next/link";

export default function Layout({children}: PropsWithChildren) {
  const headerContext = useContext(HeaderContext);

  useEffect(() => {
    headerContext.setTitle("Guests");
    headerContext.setShowLocationPicker(true);
    headerContext.setPaths([
      <Link key={"residents"} href={"/residents"}>Residents</Link>,
      <Link key={"guests"} href={"/guests"}>Guests</Link>
    ]);
  }, []);

  return (
    <>
      {children}
    </>
  );
}
