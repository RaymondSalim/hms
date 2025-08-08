"use client";

import {useHeader} from "@/app/_context/HeaderContext";
import React, {use, useEffect} from "react";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";
import BillsContent from "@/app/(internal)/(dashboard_layout)/bills/content";
import {getAllBillsIncludeAll,} from "@/app/(internal)/(dashboard_layout)/bills/bill-action";

export type BillPageQueryParams = {
    action?: "create" | "search",
    id?: string
    booking_id?: string
    room_number?: string
}

export const fetchCache = 'default-cache';

export default function BillPage(props: {
    params?: Promise<any>,
    searchParams?: Promise<BillPageQueryParams>
}) {
    const searchParams = use(props.searchParams ?? Promise.resolve(undefined));
    const headerContext = useHeader();

    useEffect(() => {
        headerContext.setTitle("Semua Tagihan");
        headerContext.setShowLocationPicker(true);
        headerContext.setPaths([
            <Link key={"payments"} href={"/bills"}>Pembayaran</Link>,
        ]);
    }, []);

    const {
        data: bills,
        isLoading,
        isSuccess
    } = useQuery({
        queryKey: ['bills', 'location_id', headerContext.locationID],
        queryFn: () => getAllBillsIncludeAll(undefined, headerContext.locationID)
    });

    return (
        <>
            {
                isLoading &&
                <span className={"mx-auto h-8 w-8"}><AiOutlineLoading className="animate-spin"/></span>
            }
            {
                isSuccess &&
                <BillsContent
                    // @ts-expect-error
                    bills={bills}
                    queryParams={searchParams}
                />
            }
        </>
    );
}
