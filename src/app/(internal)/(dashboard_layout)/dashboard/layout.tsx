"use client";

import {PropsWithChildren, useEffect} from "react";
import {useHeader} from "@/app/_context/HeaderContext";
import Link from "next/link";

export default function Layout({children}: PropsWithChildren) {
  const headerContext = useHeader();

  useEffect(() => {
    headerContext.setTitle("Dashboard");
    headerContext.setPaths([
      <Link key={"dashboard"} href={"/dashboard"}>Dashboard</Link>
    ]);
  }, []);

  return (
    <>
      {children}
    </>
  );
}
