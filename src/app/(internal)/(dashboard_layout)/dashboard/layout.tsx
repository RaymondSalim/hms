"use client";

import {PropsWithChildren, useContext, useEffect} from "react";
import {HeaderContext} from "@/app/_context/HeaderContext";
import Link from "next/link";

export default function Layout({children}: PropsWithChildren) {
  const headerContext = useContext(HeaderContext);

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
