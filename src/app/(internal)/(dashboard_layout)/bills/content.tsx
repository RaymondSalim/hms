"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React, {useState} from "react";
import {formatToDateTime, formatToIDR} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {useHeader} from "@/app/_context/HeaderContext";
import {Prisma} from "@prisma/client";
import {BillIncludeAll, BillIncludeBookingAndPayments} from "@/app/_db/bills";
import {BillForm} from "@/app/(internal)/(dashboard_layout)/bills/form";
import {
    deleteBillAction,
    sendBillEmailAction,
    upsertBillAction
} from "@/app/(internal)/(dashboard_layout)/bills/bill-action";
import Link from "next/link";
import {Button, Dialog, Typography} from "@material-tailwind/react";
import {useMutation, UseMutationResult} from "@tanstack/react-query";
import {MdEmail} from "react-icons/md";
import {toast} from "react-toastify";
import {SelectOption} from "@/app/_components/input/select";
import {BillPageQueryParams} from "@/app/(internal)/(dashboard_layout)/bills/page";


export interface BillsContentProps {
    bills: BillIncludeAll[]
    queryParams?: BillPageQueryParams
}

export default function BillsContent({bills, queryParams}: BillsContentProps) {
    const headerContext = useHeader();
    let [dataState, setDataState] = useState<typeof bills>(bills);
    let [showDialog, setShowDialog] = useState(false);
    let [dialogContent, setDialogContent] = useState(<></>);

    const sendBillEmailMutation = useMutation({
        mutationFn: sendBillEmailAction,
        onSuccess: (resp) => {
            if (resp.success) {
                toast.success("Email telah dikirim!");
            } else {
                toast.error("Email gagal dikirim!");
            }
            setShowDialog(false);
        }
    });

    const columnHelper = createColumnHelper<typeof bills[0]>();
    const columns = [
        columnHelper.accessor(row => row.id, {
            id: "id",
            header: "ID",
            enableColumnFilter: true,
            size: 20,
        }),
        columnHelper.accessor(row => row.bookings?.custom_id ?? row.bookings?.id, {
            id: "booking_id",
            header: "ID Pemesanan",
            enableColumnFilter: true,
        }),
        columnHelper.accessor(row => row.bookings?.rooms?.room_number, {
            id: "room_number",
            header: "Nomor Kamar",
            enableColumnFilter: true,
        }),
        columnHelper.accessor(row => row.description, {
            header: "Deskripsi",
            minSize: 275
        }),
        columnHelper.accessor(row => formatToIDR(
            row.bill_item
                .map(bi => bi.amount)
                .reduce((prevSum, bi) => new Prisma.Decimal(bi).add(prevSum), new Prisma.Decimal(0)
                ).toNumber()), {
            header: "Jumlah",
        }),
        columnHelper.accessor(row => {
            if (row.paymentBills) {
                return formatToIDR(row.paymentBills?.map(pb => new Prisma.Decimal(pb.amount).toNumber()).reduce((sum, curr) => sum + curr, 0));
            }
            return formatToIDR(0);
        }, {
            header: "Jumlah Terbayar",
        }),
        columnHelper.display({
            header: "Rincian Tagihan",
            cell: props => (
                <Link
                    className="text-blue-500 hover:underline"
                    onClick={() => {
                        setDialogContent(
                            <DetailsDialogContent
                                activeData={props.row.original}
                                setShowDialog={setShowDialog}
                            />
                        );
                        setShowDialog(true);
                    }}
                    href={{}}
                >
                    Lihat Rincian
                </Link>
            ),
        }),
    ];

    if (!headerContext.locationID) {
        // @ts-ignore
        columns.splice(1, 0, columnHelper.accessor(row => row.bookings?.rooms?.locations.name ?? "", {
                header: "Lokasi",
                size: 20
            })
        );
    }

    const filterKeys: SelectOption<string>[] = columns
        .filter(c => (
            c.enableColumnFilter && c.header && c.id
        ))
        .map(c => ({
            label: c.header!.toString(),
            value: c.id!,
        }));

    return (
        <TableContent<typeof bills[0]>
            name={"Pemesanan"}
            initialContents={dataState}
            columns={columns}
            form={
                // @ts-expect-error
                <BillForm/>
            }
            searchPlaceholder={"TODO!"} // TODO!
            // TODO! Data should refresh on CRUD
            upsert={{
                // @ts-expect-error
                mutationFn: upsertBillAction,
            }}

            delete={{
                // @ts-expect-error
                mutationFn: deleteBillAction,
            }}
            additionalActions={{
                position: "before",
                actions: [
                    {
                        generateButton: (rowData) => {
                            return (
                                <MdEmail
                                    key={`${rowData.id}_email`}
                                    className="h-5 w-5 cursor-pointer hover:text-blue-500"
                                    onClick={() => {
                                        setDialogContent(
                                            <EmailConfirmationDialog
                                                activeData={rowData}
                                                sendBillEmailMutation={sendBillEmailMutation}
                                                setShowDialog={setShowDialog}
                                            />
                                        );
                                        setShowDialog(true);
                                    }}/>
                            );
                        }
                    }
                ]
            }}
            customDialog={
                <Dialog
                    open={showDialog}
                    size={"lg"}
                    handler={() => setShowDialog(prev => !prev)}
                    className={"p-8"}
                >
                    {dialogContent}
                </Dialog>
            }
            searchType={"smart"}
            filterKeys={filterKeys}
            queryParams={
                (queryParams?.action == undefined || queryParams?.action == "search") ?
                    {
                        action: "search",
                        values: queryParams,
                    } : undefined
                    /*{
                        action: "create",
                        initialActiveContent: {...queryParams} as unknown as typeof bills[0]
                    }*/
            }
        />
    );
}

const DetailsDialogContent = ({activeData, setShowDialog}: {
    activeData: BillIncludeAll;
    setShowDialog: React.Dispatch<React.SetStateAction<boolean>>
}) => (
    <>
        <Typography variant="h5" color="black" className="mb-4">Detail Tagihan dan Pembayaran</Typography>
        <Typography variant="h6" color="blue-gray" className="mb-2">Rincian Tagihan</Typography>
        <table className="w-full table-auto text-left mb-6">
            <thead>
            <tr>
                {["Deskripsi", "Harga"].map((el) => (
                    <th key={el} className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                        <Typography variant="small" color="blue-gray"
                                    className="font-normal leading-none opacity-70">
                            {el}
                        </Typography>
                    </th>
                ))}
            </tr>
            </thead>
            <tbody>
            {
                activeData.bill_item && activeData.bill_item.length > 0 ?
                    activeData.bill_item.map((item, index) => (
                        <tr key={index}>
                            <td className="border-b border-blue-gray-50 p-4">
                                <Typography variant="small" color="blue-gray" className="font-normal">
                                    {item.description}
                                </Typography>
                            </td>
                            <td className="border-b border-blue-gray-50 p-4">
                                <Typography variant="small" color="blue-gray" className="font-normal">
                                    {formatToIDR(new Prisma.Decimal(item.amount).toNumber())}
                                </Typography>
                            </td>
                        </tr>
                    )) :
                    <tr>
                        <td colSpan={3} className="p-4">
                            <Typography>Tidak ada rincian tagihan.</Typography>
                        </td>
                    </tr>
            }
            </tbody>
        </table>

        <Typography variant="h6" color="blue-gray" className="mb-2">Pembayaran</Typography>
        <table className="w-full table-auto text-left">
            <thead>
            <tr>
                {["ID", "Tanggal", "Jumlah Pembayaran", "Pembayaran yang Dialokasikan", ""].map((el) => (
                    <th key={el} className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                        <Typography variant="small" color="blue-gray"
                                    className="font-normal leading-none opacity-70">
                            {el}
                        </Typography>
                    </th>
                ))}
            </tr>
            </thead>
            <tbody>
            {
                activeData.paymentBills && activeData.paymentBills.length > 0 ?
                    activeData.paymentBills.map((pb, index) => (
                        <tr key={pb.payment.id}>
                            <td className="border-b border-blue-gray-50 p-4">
                                <Typography variant="small" color="blue-gray" className="font-normal">
                                    {pb.payment.id}
                                </Typography>
                            </td>
                            <td className="border-b border-blue-gray-50 p-4">
                                <Typography variant="small" color="blue-gray" className="font-normal">
                                    {formatToDateTime(pb.payment.payment_date)}
                                </Typography>
                            </td>
                            <td className="border-b border-blue-gray-50 p-4">
                                <Typography variant="small" color="blue-gray" className="font-normal">
                                    {formatToIDR(new Prisma.Decimal(pb.payment.amount).toNumber())}
                                </Typography>
                            </td>
                            <td className="border-b border-blue-gray-50 p-4">
                                <Typography variant="small" color="blue-gray" className="font-normal">
                                    {formatToIDR(new Prisma.Decimal(pb.amount).toNumber())}
                                </Typography>
                            </td>
                            <td className="border-b border-blue-gray-50 p-4">
                                <Link
                                    href={{
                                        pathname: "/payments",
                                        query: {
                                            payment_id: pb.payment.id,
                                        }
                                    }}
                                    className="font-normal"
                                >
                                    <Typography variant="small" color="blue-gray" className="font-normal">
                                        {"More Info"}
                                    </Typography>
                                </Link>
                            </td>
                        </tr>
                    )) :
                    <tr>
                        <td colSpan={5} className="p-4">
                            <Typography>Tidak ada pembayaran yang telah dilakukan</Typography>
                        </td>
                    </tr>
            }
            </tbody>
        </table>

        <div className="flex gap-x-4 justify-end">
            <Button onClick={() => setShowDialog(false)} variant="outlined" className="mt-6">
                Tutup
            </Button>
        </div>
    </>
);

const EmailConfirmationDialog = ({activeData, sendBillEmailMutation, setShowDialog}: {
    activeData: BillIncludeBookingAndPayments;
    sendBillEmailMutation: UseMutationResult<{ failure: string, success?: undefined } | {
        success: string,
        failure?: undefined
    }, Error, number, unknown>
    setShowDialog: React.Dispatch<React.SetStateAction<boolean>>
}) => {
    return (
        <>
            <Typography variant="h5" color="black" className="mb-4">Kirim Pengingat Tagihan</Typography>
            <Typography variant="paragraph" color="black">Apakah anda mau mengirimkan email ini?</Typography>
            <div className={"flex gap-x-4 justify-end"}>
                <Button onClick={() => setShowDialog(false)} variant={"outlined"} className="mt-6">
                    Tutup
                </Button>
                <Button
                    onClick={(e) => {
                        e.currentTarget.disabled = true;
                        if (activeData) {
                            sendBillEmailMutation.mutate(activeData.id);
                        }
                    }}
                    color={"blue"}
                    className="mt-6"
                    loading={sendBillEmailMutation.isPending}
                >
                    Kirim
                </Button>
            </div>
        </>
    );
};
