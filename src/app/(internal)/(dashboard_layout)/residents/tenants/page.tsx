"use client";

import React, {useContext, useEffect} from "react";
import {HeaderContext} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";
import {getTenantsWithRooms} from "@/app/_db/tenant";
import TenantsContent from "@/app/(internal)/(dashboard_layout)/residents/tenants/content";

export default function TenantsPage() {
  const headerContext = useContext(HeaderContext);

  useEffect(() => {
    headerContext.setTitle("Penyewa");
    headerContext.setShowLocationPicker(true);
    headerContext.setPaths([
      <Link key={"residents"} href={"/src/app/(internal)/(dashboard_layout)/residents"}>Penghuni</Link>,
      <Link key={"tenants"} href={"/tenants"}>Penyewa</Link>
    ]);
  }, []);

  const {data: tenants, isLoading, isSuccess} = useQuery({
    queryKey: ['tenants', headerContext.locationID],
    queryFn: () => getTenantsWithRooms(undefined, headerContext.locationID, undefined, undefined),
  });

  return (
    <>
      {
        isLoading &&
          <span className={"mx-auto h-8 w-8"}><AiOutlineLoading className="animate-spin"/></span>
      }
      {
        isSuccess &&
          <TenantsContent tenants={tenants}/>
      }
    </>
  );
}
