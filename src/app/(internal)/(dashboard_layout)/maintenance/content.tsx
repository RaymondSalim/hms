"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React, {useState} from "react";
import {formatToDateTime} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {useHeader} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {MaintenanceForm} from "@/app/(internal)/(dashboard_layout)/maintenance/form";
import {MaintenanceTaskInclude} from "@/app/(internal)/(dashboard_layout)/maintenance/maintenance-action";
import {deleteMaintenanceTaskAction, upsertMaintenanceTaskAction} from "@/app/(internal)/(dashboard_layout)/maintenance/maintenance-action";

export interface MaintenanceContentProps {
  tasks: MaintenanceTaskInclude[];
}

export default function MaintenanceContent({tasks}: MaintenanceContentProps) {
  const headerContext = useHeader();
  const [dataState, setDataState] = useState<typeof tasks>(tasks);

  const columnHelper = createColumnHelper<typeof tasks[0]>();
  const columns = [
    columnHelper.accessor(row => row.id, { header: "ID", size: 20 }),
    columnHelper.accessor(row => row.title, { header: "Judul" }),
    columnHelper.accessor(row => row.status, { header: "Status" }),
    columnHelper.accessor(row => row.due_date ? formatToDateTime(new Date(row.due_date), false) : "-", { header: "Jatuh Tempo" }),
    columnHelper.accessor(row => row.rooms?.room_number, { header: "Kamar" }),
    columnHelper.accessor(row => row.locations?.name, { header: "Lokasi" }),
    columnHelper.accessor(row => formatToDateTime(row.createdAt), { header: "Dibuat" }),
  ];

  if (!headerContext.locationID) {
    // if multi-location view, show location column maybe; already included
  }

  return (
    <TableContent<typeof tasks[0]>
      name="Tugas"
      initialContents={dataState}
      columns={columns}
      form={
        // @ts-ignore
        <MaintenanceForm/>
      }
      searchPlaceholder="Cari tugas"
      upsert={{
        // @ts-ignore
        mutationFn: upsertMaintenanceTaskAction,
      }}
      delete={{
        // @ts-ignore
        mutationFn: deleteMaintenanceTaskAction,
      }}
    />
  );
}
