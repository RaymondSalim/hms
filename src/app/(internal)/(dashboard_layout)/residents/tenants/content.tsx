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

  const columnHelper = createColumnHelper<typeof tenants[0]>();
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
            setDialogContent(<TenantInfo tenant={props.row.original} />);
            setShowDialog(true);
          }}>Lihat Selengkapnya</Link>
    }),
    columnHelper.accessor(row => row.createdAt, {
      header: "Dibuat Pada",
      cell: props => formatToDateTime(props.cell.getValue())
    }),
  ];

  const query = useSearchParams();

  return (
    <div className={"p-8"}>
      <TableContent<typeof tenants[0]>
        name={"Penyewa"}
        initialContents={tenants}
        initialSearchValue={query.get("tenant_id") ?? undefined}
        columns={columns}
        form={
          // @ts-ignore
          <TenantForm/>
        }
        searchPlaceholder={"Cari berdasarkan nama atau alamat email"}
        upsert={{
          mutationFn: upsertTenantAction,
        }}

        delete={{
          // @ts-expect-error mismatch types
          mutationFn: deleteTenantAction,
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
    </div>
  );
}

interface TenantInfoProps {
  tenant: TenantWithRoomsAndSecondResident;
}

function TenantInfo({tenant}: TenantInfoProps){
  return (
      <div className="container mx-auto p-6 h-full">
        <h1 className={"text-xl font-semibold text-black"}>Informasi Penghuni</h1>
        <Card className="shadow-none">
          <CardBody className="space-y-4">
            {/* Basic Information */}
            <Typography variant="h5" className="font-semibold">Informasi Dasar</Typography>
            <Typography><strong>Nama Lengkap:</strong> {tenant.name}</Typography>
            <Typography><strong>Nomor Identitas:</strong> {tenant.id_number}</Typography>
            <Typography><strong>Email:</strong> {tenant.email || "N/A"}</Typography>
            <Typography><strong>Nomor Telepon:</strong> {tenant.phone || "N/A"}</Typography>

            {/* Address */}
            <Typography variant="h5" className="font-semibold mt-4">Alamat</Typography>
            <Typography><strong>Alamat terkini:</strong> {tenant.current_address || "N/A"}</Typography>

            {/* Emergency Contact */}
            <Typography variant="h5" className="font-semibold mt-4">Kontak Darurat</Typography>
            <Typography><strong>Nama:</strong> {tenant.emergency_contact_name || "N/A"}</Typography>
            <Typography><strong>Nomor Telepon:</strong> {tenant.emergency_contact_phone || "N/A"}</Typography>

            {/* Second Resident */}
            <Typography variant="h5" className="font-semibold mt-4">Penghuni Kedua</Typography>
            {tenant.second_resident ? (
                <>
                  <Typography><strong>Nama:</strong> {tenant.second_resident.name}</Typography>
                  <Typography><strong>Hubunan:</strong> {tenant.second_resident_relation}</Typography>
                </>
            ) : (
                <Typography>Tidak ada penghuni kedua</Typography>
            )}

            {/* Additional Information */}
            <Typography variant="h5" className="font-semibold mt-4">Informasi Tambahan</Typography>
            <Typography><strong>Sumber referral:</strong> {tenant.referral_source || "N/A"}</Typography>

            {/* Documents */}
            <Typography variant="h5" className="font-semibold mt-4">Dokumen</Typography>
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

          <CardFooter divider className="flex items-center justify-between py-3">
            <Typography variant="small" color="gray">
              Dibuat Pada: {new Date(tenant.createdAt).toLocaleDateString()}
            </Typography>
            <Typography variant="small" color="gray">
              Terakhir Diubah: {new Date(tenant.updatedAt).toLocaleDateString()}
            </Typography>
          </CardFooter>
        </Card>
      </div>
  );
};

