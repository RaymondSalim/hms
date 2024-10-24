"use client";

import {PropsWithChildren, useContext, useEffect} from "react";
import {HeaderContext} from "@/app/_context/HeaderContext";
import Link from "next/link";

export default function Layout({children}: PropsWithChildren) {
  const headerContext = useContext(HeaderContext);

  useEffect(() => {
    headerContext.setTitle("Users");
    headerContext.setShowLocationPicker(false);
    headerContext.setPaths([
      <Link key={"settings"} href={"/src/app/(internal)/(dashboard_layout)/settings"}>Settings</Link>,
      <Link key={"users"} href={"/users"}>Users</Link>
    ]);
  }, []);

  return (
    <>
      {children}
    </>
  );
}
