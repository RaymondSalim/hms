"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React, {useEffect, useRef, useState} from "react";
import {delay, formatToDateTime} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {TenantWithRoomsAndSecondResident} from "@/app/_db/tenant";
import {TenantForm} from "@/app/(internal)/(dashboard_layout)/residents/tenants/form";
import {
    deleteTenantAction,
    upsertTenantAction
} from "@/app/(internal)/(dashboard_layout)/residents/tenants/tenant-action";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {Button, Card, CardBody, CardFooter, Dialog, Typography} from "@material-tailwind/react";


export interface TenantsContentProps {
    tenants: TenantWithRoomsAndSecondResident[];
}

export default function TenantsContent({tenants}: TenantsContentProps) {
    let [dialogContent, setDialogContent] = useState(<></>);
    let [showDialog, setShowDialog] = useState(false);

    const dialogRef = useRef<HTMLDivElement>(null);

    // Ensure the dialog scrolls to the top when opened
    useEffect(() => {
        if (showDialog) {
            delay(10).then(() => requestAnimationFrame(() => {
                dialogRef.current?.scrollTo({top: 0, behavior: "smooth"});
            }));
        }
    }, [showDialog, dialogContent]);

    // Add computed status property for filtering
    const tenantsWithStatus = tenants.map(t => {
        const now = new Date();
        let status: 'current' | 'future' | 'ex' = 'ex';
        if (t.bookings && t.bookings.length > 0) {
            const allFuture = t.bookings.every(b => new Date(b.start_date) > now);
            const allPast = t.bookings.every(b => b.end_date && new Date(b.end_date) < now);
            const isCurrent = t.bookings.some(b => (!b.end_date || new Date(b.end_date) >= now) && new Date(b.start_date) <= now);
            if (isCurrent) status = 'current';
            else if (allFuture) status = 'future';
            else if (allPast) status = 'ex';
        }
        return {...t, status};
    });

    const columnHelper = createColumnHelper<typeof tenantsWithStatus[0]>();
    const columns = [
        columnHelper.accessor(row => row.id, {
            header: "ID",
            size: 20
        }),
        columnHelper.accessor(row => row.name, {
            header: "Nama"
        }),
        columnHelper.accessor(row => row.email, {
            header: "Alamat Email"
        }),
        columnHelper.display({
            header: "Detail",
            cell: props =>
                <Link className={"text-blue-400"} type="button" href="" onClick={() => {
                    setDialogContent(<TenantInfo tenant={props.row.original}/>);
                    setShowDialog(true);
                }}>Lihat Selengkapnya</Link>
        }),
        columnHelper.accessor(row => row.createdAt, {
            header: "Dibuat Pada",
            enableGlobalFilter: false,
            enableColumnFilter: false,
            cell: props => formatToDateTime(props.cell.getValue(), true, false),
        }),
        columnHelper.accessor(row => row.status, {
            id: 'status',
            cell: undefined,
            meta: {
                hidden: true,
            }
        })
    ];

    const query = useSearchParams();

    return (
        <TableContent<typeof tenantsWithStatus[0]>
            name={"Penyewa"}
            initialContents={tenantsWithStatus}
            initialSearchValue={query.get("tenant_id") ?? undefined}
            columns={columns}
            form={
                // @ts-ignore
                <TenantForm/>
            }
            searchPlaceholder={"Cari berdasarkan nama atau alamat email"}
            upsert={{
                // @ts-expect-error mismatch types
                mutationFn: upsertTenantAction,
            }}
            delete={{
                // @ts-expect-error mismatch types
                mutationFn: deleteTenantAction,
            }}
            customDialog={
                // @ts-expect-error weird react 19 types error
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
                        {/*@ts-expect-error weird react 19 types error*/}
                        <Button onClick={() => setShowDialog(false)} variant={"filled"} className="mt-6">
                            Tutup
                        </Button>
                    </div>
                </Dialog>
            }
            filterByOptions={{
                columnId: 'status',
                options: [
                    {value: 'current', label: 'Aktif'},
                    {value: 'future', label: 'Mendatang'},
                    {value: 'ex', label: 'Sudah Keluar'},
                ],
                allLabel: 'Semua',
            }}
        />
    );
}

interface TenantInfoProps {
    tenant: TenantWithRoomsAndSecondResident;
}

function TenantInfo({tenant}: TenantInfoProps) {
    return (
        <div className="container mx-auto p-6 h-full">
            <h1 className="text-xl font-semibold text-black">Informasi Penghuni</h1>
            {/* @ts-expect-error weird react 19 types error */}
            <Card className="shadow-none">
                {/* @ts-expect-error weird react 19 types error */}
                <CardBody className="mt-4 p-0 space-y-4">
                    {/* Basic Information */}
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography variant="h5" className="font-semibold">Informasi Dasar</Typography>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography><strong>Nama Lengkap:</strong> {tenant.name}</Typography>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography><strong>Nomor Identitas:</strong> {tenant.id_number}</Typography>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography><strong>Email:</strong> {tenant.email || "N/A"}</Typography>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography><strong>Nomor Telepon:</strong> {tenant.phone || "N/A"}</Typography>

                    {/* Address */}
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography variant="h5" className="font-semibold mt-4">Alamat</Typography>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography>
                        <strong>Alamat Terkini:</strong> {tenant.current_address || "N/A"}
                    </Typography>

                    {/* Emergency Contact */}
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography variant="h5" className="font-semibold mt-4">Kontak Darurat</Typography>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography><strong>Nama:</strong> {tenant.emergency_contact_name || "N/A"}</Typography>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography><strong>Nomor Telepon:</strong> {tenant.emergency_contact_phone || "N/A"}</Typography>

                    {/* Second Resident */}
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography variant="h5" className="font-semibold mt-4">Penghuni Kedua</Typography>
                    {tenant.second_resident_name ? (
                        <>
                            {/* @ts-expect-error weird react 19 types error */}
                            <Typography>
                                <strong>Nama:</strong> {tenant.second_resident_name}
                            </Typography>
                            {/* @ts-expect-error weird react 19 types error */}
                            <Typography>
                                <strong>Nomor Identitas:</strong> {tenant.second_resident_id_number || "N/A"}
                            </Typography>
                            {/* @ts-expect-error weird react 19 types error */}
                            <Typography>
                                <strong>Hubungan:</strong> {tenant.second_resident_relation || "N/A"}
                            </Typography>
                            {/* @ts-expect-error weird react 19 types error */}
                            <Typography>
                                <strong>Email:</strong> {tenant.second_resident_email || "N/A"}
                            </Typography>
                            {/* @ts-expect-error weird react 19 types error */}
                            <Typography>
                                <strong>Nomor Telepon:</strong> {tenant.second_resident_phone || "N/A"}
                            </Typography>
                            {/* @ts-expect-error weird react 19 types error */}
                            <Typography>
                                <strong>Dokumen Identitas:</strong>{" "}
                                {tenant.second_resident_id_file ? (
                                    <Link
                                        href={{
                                            pathname: `/s3/${tenant.second_resident_id_file}`,
                                        }}
                                        className="text-blue-500 underline"
                                    >
                                        Unduh Dokumen
                                    </Link>
                                ) : (
                                    "N/A"
                                )}
                            </Typography>
                        </>
                    ) : (
                         // @ts-expect-error weird react 19 types error
                        <Typography>Tidak ada penghuni kedua</Typography>
                    )}

                    {/* Additional Information */}
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography variant="h5" className="font-semibold mt-4">Informasi Tambahan</Typography>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography>
                        <strong>Sumber Referral:</strong> {tenant.referral_source || "N/A"}
                    </Typography>

                    {/* Documents */}
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography variant="h5" className="font-semibold mt-4">Dokumen</Typography>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography>
                        <strong>KTP/SIM:</strong>{" "}
                        {tenant.id_file ? (
                            <Link href={{
                                pathname: `/s3/${tenant.id_file}`,
                            }}
                                  className="text-blue-500 underline">
                                Unduh Dokumen
                            </Link>
                        ) : (
                            "N/A"
                        )}
                    </Typography>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography>
                        <strong>Kartu Keluarga:</strong>{" "}
                        {tenant.family_certificate_file ? (
                            <Link href={{
                                pathname: `/s3/${tenant.family_certificate_file}`,
                            }}
                                  className="text-blue-500 underline">
                                Unduh Dokumen
                            </Link>
                        ) : (
                            "N/A"
                        )}
                    </Typography>
                </CardBody>

                {/* @ts-expect-error weird react 19 types error */}
                <CardFooter divider className="flex items-center justify-between py-3">
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography variant="small" color="gray">
                        Dibuat Pada: {new Date(tenant.createdAt).toLocaleDateString()}
                    </Typography>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Typography variant="small" color="gray">
                        Terakhir Diubah: {new Date(tenant.updatedAt).toLocaleDateString()}
                    </Typography>
                </CardFooter>
            </Card>
        </div>
    );
};

