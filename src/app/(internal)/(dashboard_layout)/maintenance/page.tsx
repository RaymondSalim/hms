"use client";

import {useHeader} from "@/app/_context/HeaderContext";
import React, {useEffect} from "react";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";
import MaintenanceContent from "@/app/(internal)/(dashboard_layout)/maintenance/content";
import {fetchMaintenanceTasks} from "@/app/(internal)/(dashboard_layout)/maintenance/maintenance-action";

export default function MaintenancePage() {
  const headerContext = useHeader();

  useEffect(() => {
    headerContext.setTitle("Tugas Maintenance");
    headerContext.setShowLocationPicker(true);
    headerContext.setPaths([
      <Link key="maintenance" href="/maintenance">Maintenance</Link>,
    ]);
  }, []);

  const { data: tasks, isLoading, isSuccess } = useQuery({
    queryKey: ['maintenanceTasks', 'location_id', headerContext.locationID],
    queryFn: () => fetchMaintenanceTasks(headerContext.locationID),
  });

  return (
    <>
      {isLoading && <span className="mx-auto h-8 w-8"><AiOutlineLoading className="animate-spin"/></span>}
      {isSuccess && (
        // @ts-ignore
        <MaintenanceContent tasks={tasks}/>
      )}
    </>
  );
}
