"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React, {useState} from "react";
import {formatToDateTime, formatToIDR} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {useHeader} from "@/app/_context/HeaderContext";
import {Prisma} from "@prisma/client";
import {BillIncludeAll} from "@/app/_db/bills";
import Link from "next/link";
import {Button, Dialog, Typography} from "@material-tailwind/react";
import {QueryObserverResult, RefetchOptions} from "@tanstack/react-query";
import {IncomeForm} from "@/app/(internal)/(dashboard_layout)/financials/incomes/form";
import {
    deleteTransactionAction,
    upsertTransactionAction
} from "@/app/(internal)/(dashboard_layout)/financials/transaction-action";
import {TransactionWithBookingInfo} from "@/app/_db/transaction";


export interface IncomesContentProps {
    incomes: TransactionWithBookingInfo[]
    refetchFn: (options?: RefetchOptions) => Promise<QueryObserverResult<TransactionWithBookingInfo[]>>
}

export default function IncomesContent({incomes, refetchFn}: IncomesContentProps) {
    const headerContext = useHeader();
    let [dataState, setDataState] = useState<typeof incomes>(incomes);
    let [showDialog, setShowDialog] = useState(false);
    let [dialogContent, setDialogContent] = useState(<></>);

    const columnHelper = createColumnHelper<typeof incomes[0]>();
    const columns = [
        columnHelper.accessor(row => row.date, {
            id: "date",
            header: "Tanggal",
            meta: {filterType: "dateRange"},
            cell: props => formatToDateTime(props.getValue(), false)
        }),
        columnHelper.accessor(row => row.category, {
            header: "Kategori",
        }),
        columnHelper.accessor(row => new Prisma.Decimal(row.amount).toNumber(), {
            header: "Jumlah",
            meta: {filterType: "currencyRange"},
            cell: props => formatToIDR(props.getValue())
        }),
        columnHelper.accessor(row => row.description, {
            header: "Deskripsi",
            minSize: 200
        }),
        columnHelper.accessor(row => row.booking?.id || "", {
            id: "booking_id",
            header: "Booking ID",
            cell: props => props.row.original.booking?.id ? `#${props.row.original.booking.id}` : "-"
        }),
        columnHelper.accessor(row => row.room_number || "", {
            header: "Nomor Kamar",
            cell: props => props.row.original.room_number || "-"
        }),
        // columnHelper.display({
        //     header: "Rincian Tagihan",
        //     cell: props => (
        //         <Link
        //             className="text-blue-500 hover:underline"
        //             onClick={() => {
        //                 setDialogContent(
        //                     <DetailsDialogContent
        //                         activeData={props.row.original}
        //                         setShowDialog={setShowDialog}
        //                     />
        //                 );
        //                 setShowDialog(true);
        //             }}
        //             href={{}}
        //         >
        //             Lihat Rincian
        //         </Link>
        //     ),
        // }),
    ];

    if (!headerContext.locationID) {
        // @ts-ignore
        columns.splice(1, 0, columnHelper.accessor(row => row.bookings?.rooms?.locations.name ?? "", {
                header: "Lokasi",
                size: 20
            })
        );
    }

    return (
        <TableContent<typeof incomes[0]>
            name={"Pengeluaran"}
            initialContents={dataState}
            columns={columns}
            form={
                // @ts-expect-error
                <IncomeForm/>
            }
            searchPlaceholder={"TODO!"} // TODO!
            upsert={{
                // @ts-expect-error weird type error
                mutationFn: upsertTransactionAction,
            }}

            delete={{
                // @ts-expect-error weird type error
                mutationFn: deleteTransactionAction,
            }}
            // additionalActions={{
            //     position: "before",
            //     actions: [
            //         {
            //             generateButton: (rowData) => {
            //                 return (
            //                     <MdEmail
            //                         key={`${rowData.id}_email`}
            //                         className="h-5 w-5 cursor-pointer hover:text-blue-500"
            //                         onClick={() => {
            //                             setDialogContent(
            //                                 <EmailConfirmationDialog
            //                                     activeData={rowData}
            //                                     sendBillEmailMutation={sendBillEmailMutation}
            //                                     setShowDialog={setShowDialog}
            //                                 />
            //                             );
            //                             setShowDialog(true);
            //                         }}/>
            //                 );
            //             }
            //         }
            //     ]
            // }}
            persistFiltersToUrl
            customDialog={
                // @ts-expect-error weird react 19 types error
                <Dialog
                    open={showDialog}
                    size={"lg"}
                    handler={() => setShowDialog(prev => !prev)}
                    className={"p-8"}
                >
                    {dialogContent}
                </Dialog>
            }
        />
    );
}

const DetailsDialogContent = ({activeData, setShowDialog}: {
    activeData: BillIncludeAll;
    setShowDialog: React.Dispatch<React.SetStateAction<boolean>>
}) => (
    <>
        {/*@ts-expect-error weird react 19 types error*/}
        <Typography variant="h5" color="black" className="mb-4">Detail Tagihan dan Pembayaran</Typography>
        {/*@ts-expect-error weird react 19 types error*/}
        <Typography variant="h6" color="blue-gray" className="mb-2">Rincian Tagihan</Typography>
        <table className="w-full table-auto text-left mb-6">
            <thead>
            <tr>
                {["Deskripsi", "Harga"].map((el) => (
                    <th key={el} className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                        {/*@ts-expect-error weird react 19 types error*/}
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
                                {/*@ts-expect-error weird react 19 types error*/}
                                <Typography variant="small" color="blue-gray" className="font-normal">
                                    {item.description}
                                </Typography>
                            </td>
                            <td className="border-b border-blue-gray-50 p-4">
                                {/*@ts-expect-error weird react 19 types error*/}
                                <Typography variant="small" color="blue-gray" className="font-normal">
                                    {formatToIDR(new Prisma.Decimal(item.amount).toNumber())}
                                </Typography>
                            </td>
                        </tr>
                    )) :
                    <tr>
                        <td colSpan={3} className="p-4">
                            {/*@ts-expect-error weird react 19 types error*/}
                            <Typography>Tidak ada rincian tagihan.</Typography>
                        </td>
                    </tr>
            }
            </tbody>
        </table>

        {/*@ts-expect-error weird react 19 types error*/}
        <Typography variant="h6" color="blue-gray" className="mb-2">Pembayaran</Typography>
        <table className="w-full table-auto text-left">
            <thead>
            <tr>
                {["ID", "Tanggal", "Jumlah Pembayaran", "Pembayaran yang Dialokasikan", ""].map((el) => (
                    <th key={el} className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                        {/*@ts-expect-error weird react 19 types error*/}
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
                                {/*@ts-expect-error weird react 19 types error*/}
                                <Typography variant="small" color="blue-gray" className="font-normal">
                                    {pb.payment.id}
                                </Typography>
                            </td>
                            <td className="border-b border-blue-gray-50 p-4">
                                {/*@ts-expect-error weird react 19 types error*/}
                                <Typography variant="small" color="blue-gray" className="font-normal">
                                    {formatToDateTime(pb.payment.payment_date)}
                                </Typography>
                            </td>
                            <td className="border-b border-blue-gray-50 p-4">
                                {/*@ts-expect-error weird react 19 types error*/}
                                <Typography variant="small" color="blue-gray" className="font-normal">
                                    {formatToIDR(new Prisma.Decimal(pb.payment.amount).toNumber())}
                                </Typography>
                            </td>
                            <td className="border-b border-blue-gray-50 p-4">
                                {/*@ts-expect-error weird react 19 types error*/}
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
                                    {/*@ts-expect-error weird react 19 types error*/}
                                    <Typography variant="small" color="blue-gray" className="font-normal">
                                        {"More Info"}
                                    </Typography>
                                </Link>
                            </td>
                        </tr>
                    )) :
                    <tr>
                        <td colSpan={5} className="p-4">
                            {/*@ts-expect-error weird react 19 types error*/}
                            <Typography>Tidak ada pembayaran yang telah dilakukan</Typography>
                        </td>
                    </tr>
            }
            </tbody>
        </table>

        <div className="flex gap-x-4 justify-end">
            {/*@ts-expect-error weird react 19 types error*/}
            <Button onClick={() => setShowDialog(false)} variant="outlined" className="mt-6">
                Tutup
            </Button>
        </div>
    </>
);
