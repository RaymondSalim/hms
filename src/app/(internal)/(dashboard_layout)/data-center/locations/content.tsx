"use client";

import {createColumnHelper,} from "@tanstack/react-table";
import React, {useMemo, useState} from "react";
import {LocationForm} from "@/app/(internal)/(dashboard_layout)/data-center/locations/components/locationForm";
import {
    deleteLocationAction,
    upsertLocationAction
} from "@/app/(internal)/(dashboard_layout)/data-center/locations/location-action";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {LocationIncludeCount} from "@/app/_db/location";

export interface LocationsContentProps {
    locations: LocationIncludeCount[]
}

export function LocationsContent({locations}: LocationsContentProps) {
    const [locationsState, setLocationsState] = useState<typeof locations>(locations);

    const columnHelper = createColumnHelper<typeof locations[0]>();

    const columns = useMemo(() => [
        columnHelper.accessor(row => row.id, {
            id: "id",
            cell: undefined,
            meta: {
                hidden: true,
            }
        }),
        columnHelper.accessor(row => row.name, {
            id: "name",
            header: "Nama",
        }),
        columnHelper.accessor(row => row.address, {
            id: "address",
            header: "Alamat",
            maxSize: 360,
        }),
        columnHelper.accessor(row => row._count?.rooms, {
            id: "rooms.count",
            header: "Jumlah Kamar",
        })

    ], []);

    return (
        <TableContent<typeof locations[0]>
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
