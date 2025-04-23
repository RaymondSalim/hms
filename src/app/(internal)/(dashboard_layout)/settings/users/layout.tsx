"use client";

import {PropsWithChildren, useEffect} from "react";
import {useHeader} from "@/app/_context/HeaderContext";
import Link from "next/link";

export default function Layout({children}: PropsWithChildren) {
  const headerContext = useHeader();

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
