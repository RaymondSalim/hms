"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React, {useContext, useEffect, useRef, useState} from "react";
import {delay} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {HeaderContext} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {Button, Card, CardBody, CardFooter, Dialog, Typography} from "@material-tailwind/react";
import {usePathname, useRouter} from "next/navigation";
import {
    AddonIncludePricing,
    deleteAddOnAction,
    upsertAddonAction
} from "@/app/(internal)/(dashboard_layout)/addons/addons-action";
import {AddonForm} from "@/app/(internal)/(dashboard_layout)/addons/form";
import {AddonPageQueryParams} from "@/app/(internal)/(dashboard_layout)/addons/page";


export interface AddonContentProps {
    addons: AddonIncludePricing[]
    queryParams?: AddonPageQueryParams
}

export default function AddonContent({addons, queryParams}: AddonContentProps) {
    const headerContext = useContext(HeaderContext);

    let [dialogContent, setDialogContent] = useState(<></>);
    let [showDialog, setShowDialog] = useState(false);

    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (showDialog) {
            delay(10).then(() => requestAnimationFrame(() => {
                dialogRef.current?.scrollTo({top: 0, behavior: "smooth"});
            }));
        }
    }, [showDialog, dialogContent]);

    // const [newQueryParams, setNewQueryParams] = useState<typeof queryParams>(queryParams);
    const [addonState, setAddonState] = useState<typeof addons>(addons);

    const columnHelper = createColumnHelper<typeof addons[0]>();
    const columns = [
        columnHelper.accessor(row => row.name, {
            header: "Nama"
        }),
        columnHelper.accessor(row => row.description, {
            header: "Deskripsi",
            maxSize: 150
        }),
        columnHelper.display({
            header: "Detail",
            cell: props =>
                <Link className={"text-blue-400"} type="button" href="" onClick={() => {
                    setDialogContent(<AddonInfo addon={props.row.original}/>);
                    setShowDialog(true);
                }}>Lihat Selengkapnya</Link>
        })
    ];

    if (!headerContext.locationID) {
        // @ts-ignore
        columns.splice(1, 0, columnHelper.accessor(row => row.rooms?.locations?.name, {
                header: "Lokasi",
                size: 20
            })
        );
    }

    const router = useRouter();
    const pathname = usePathname();
    const removeQueryParams = () => {
        router.replace(`${pathname}`);
        // setNewQueryParams(undefined);
    };

    return (
        <TableContent<typeof addons[0]>
            name={"Layanan Tambahan"}
            initialContents={addonState}
            // queryParams={
            //     newQueryParams ?
            //         {
            //             initialActiveContent: {
            //                 rooms: {
            //                     location_id: newQueryParams.locationID,
            //                     room_type_id: newQueryParams.roomTypeID,
            //                 }
            //             },
            //             clearQueryParams: removeQueryParams
            //         } : undefined
            // }
            columns={columns}
            form={
                // @ts-expect-error missing props definition
                <AddonForm/>
            }
            searchPlaceholder={"TODO!"} // TODO!
            upsert={{
                // @ts-ignore
                mutationFn: upsertAddonAction,
            }}

            delete={{
                // @ts-ignore
                mutationFn: deleteAddOnAction,
            }}
            customDialog={
                <Dialog
                    open={showDialog}
                    size={"md"}
                    handler={() => setShowDialog(prev => !prev)}
                    className={"flex flex-col gap-y-4 p-8 h-[80dvh]"}
                >
                    <div ref={dialogRef} className="overflow-y-auto h-full">
                        {dialogContent}
                    </div>
                    <div className={"flex gap-x-4 justify-end"}>
                        <Button onClick={() => setShowDialog(false)} variant={"filled"} className="mt-6">
                            Tutup
                        </Button>
                    </div>
                </Dialog>
            }
        />
    );
}

interface AddonInfoProps {
    addon: AddonIncludePricing;
}

function AddonInfo({addon}: AddonInfoProps) {
    return (
        <div className="container mx-auto p-6 h-full">
            <h1 className="text-xl font-semibold text-black">Informasi Layanan Tambahan</h1>
            <Card className="shadow-none">
                <CardBody className="space-y-4">
            {/* Basic Information */}
                    <Typography variant="h5" className="font-semibold">Informasi Dasar</Typography>
                    <Typography>
                        <strong>Nama:</strong> {addon.name}
                    </Typography>
                    <Typography>
                        <strong>Deskripsi:</strong> {addon.description || "Tidak ada deskripsi yang diberikan."}
                    </Typography>
                    {addon.parent_addon_id && (
                        <Typography>
                            <strong>Parent Add-on:</strong> {addon.parent_addon_id}
                        </Typography>
                    )}

            {/* Pricing Information */}
                    <Typography variant="h5" className="font-semibold mt-4">Harga</Typography>
                    <table className="table-auto w-full border-collapse border border-gray-200">
                        <thead>
                        <tr className={"bg-gray-100"}>
                            <th className="border border-gray-300 px-4 py-2" colSpan={2}>Jangka Waktu</th>
                            <th className="border border-gray-300 px-4 py-2"></th>
                        </tr>
                        <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-4 py-2">Mulai</th>
                            <th className="border border-gray-300 px-4 py-2">Selesai</th>
                            <th className="border border-gray-300 px-4 py-2">Harga</th>
                        </tr>
                        </thead>
                        <tbody>
                        {addon.pricing.map((price) => (
                            <tr key={price.id} className="text-gray-700">
                                <td className="border border-gray-300 px-4 py-2">{price.interval_start}</td>
                                <td className="border border-gray-300 px-4 py-2">{price.interval_end || "Selesai"}</td>
                                <td className="border border-gray-300 px-4 py-2">Rp {price.price.toLocaleString()}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </CardBody>

                <CardFooter divider className="flex items-center justify-between py-3">
                    <Typography variant="small" color="gray">
                        Dibuat Pada: {new Date(addon.createdAt).toLocaleDateString()}
                    </Typography>
                    <Typography variant="small" color="gray">
                        Terakhir Diubah: {new Date(addon.updatedAt).toLocaleDateString()}
                    </Typography>
                </CardFooter>
            </Card>
        </div>
    );
}