"use client";

import {createColumnHelper,} from "@tanstack/react-table";
import React, {useMemo, useState} from "react";
import {Location} from "@prisma/client";
import {LocationForm} from "@/app/(internal)/(dashboard_layout)/data-center/locations/components/locationForm";
import {
    deleteLocationAction,
    upsertLocationAction
} from "@/app/(internal)/(dashboard_layout)/data-center/locations/location-action";
import {TableContent} from "@/app/_components/pageContent/TableContent";

export interface LocationsContentProps {
  locations: Location[]
}

export function LocationsContent({locations}: LocationsContentProps) {
  const [locationsState, setLocationsState] = useState<Location[]>(locations);

  const columnHelper = createColumnHelper<Location>();

  const columns = useMemo(() => [
    columnHelper.accessor(row => row.id, {
      id: "id",
      header: "ID",
    }),
    columnHelper.accessor(row => row.name, {
      id: "name",
      header: "Nama",
    }),
    columnHelper.accessor(row => row.address, {
      id: "address",
      header: "Alamat",
    }),
  ], []);

  return (
    <TableContent<Location>
      name={"Lokasi Properti"}
      initialContents={locationsState}
      columns={columns}
      form={
        // @ts-expect-error missing props definition
        <LocationForm/>
      }
      searchPlaceholder={"Cari Lokasi"}
      searchType="default"
      upsert={{
        // @ts-expect-error mismatch type
        mutationFn:
        upsertLocationAction,
      }}
      delete={{
        // @ts-expect-error mismatch type
        mutationFn:
        deleteLocationAction,
      }}
    />
  );
}
