"use client";

import {HeaderContext} from "@/app/_context/HeaderContext";
import React, {useContext, useEffect, useState} from "react";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";
import {useSearchParams} from "next/navigation";
import {getAddonsByLocation} from "@/app/(internal)/(dashboard_layout)/addons/addons-action";
import AddonContent from "@/app/(internal)/(dashboard_layout)/addons/content";

export type AddonPageQueryParams = {
  roomTypeID?: number
  locationID?: number
}

export default function AddonPage() {
  const headerContext = useContext(HeaderContext);
  const [locationID, setLocationID] = useState(headerContext.locationID);
  const [queryParams, setQueryParams] = useState<AddonPageQueryParams>();
  const searchParams = useSearchParams();

  useEffect(() => {
    headerContext.setTitle("Semua Layanan Tambahan");
    headerContext.setShowLocationPicker(true);
    headerContext.setPaths([
      <Link key={"addons"} href={"/addons"}>Layanan Tambahan</Link>,
    ]);

    let qp: AddonPageQueryParams = {};
    let shouldUpdate = false;

    let lID = searchParams.get("location_id");
    if (lID && Number(lID) > 0) {
      qp.locationID = Number(lID);
      setLocationID(qp.locationID);
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      setQueryParams(qp);
    }
  }, []);

  const {
    data: addons,
    isLoading,
    isSuccess
  } = useQuery({
    queryKey: ['addons', 'location_id', locationID],
    queryFn: () => getAddonsByLocation(locationID)
  });

  return (
    <>
      {
        isLoading &&
          <span className={"mx-auto h-8 w-8"}><AiOutlineLoading className="animate-spin"/></span>
      }
      {
        isSuccess &&
          <AddonContent
              queryParams={queryParams}
              addons={addons}
          />
      }
    </>
  );
}
