"use client";

import React, {useContext, useEffect} from "react";
import {HeaderContext} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";
import {getTenantsWithRooms} from "@/app/_db/tenant";
import TenantsContent from "@/app/(internal)/residents/tenants/content";

interface TenantsPageProps {
  locationID?: number
}

export default function TenantsPage(props: TenantsPageProps) {
  const headerContext = useContext(HeaderContext);

  useEffect(() => {
    headerContext.setTitle("Tenants");
    headerContext.setShowLocationPicker(true);
    headerContext.setPaths([
      <Link key={"residents"} href={"/residents"}>Residents</Link>,
      <Link key={"tenants"} href={"/tenants"}>Tenants</Link>
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
