"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React, {useCallback, useContext, useState} from "react";
import {formatToDateTime, formatToIDR} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {HeaderContext} from "@/app/_context/HeaderContext";
import {Prisma} from "@prisma/client";
import {BillIncludeBookingAndPayments} from "@/app/_db/bills";
import {BillForm} from "@/app/(internal)/bills/form";
import {deleteBillAction, sendBillEmailAction, upsertBillAction} from "@/app/(internal)/bills/bill-action";
import Link from "next/link";
import {Button, Dialog, Typography} from "@material-tailwind/react";
import {useMutation} from "@tanstack/react-query";
import {MdEmail} from "react-icons/md";


export interface BillsContentProps {
    bills: BillIncludeBookingAndPayments[]
}

export default function BillsContent({bills}: BillsContentProps) {
    const headerContext = useContext(HeaderContext);
    let [dataState, setDataState] = useState<typeof bills>(bills);
    let [showDialog, setShowDialog] = useState(false);
    let [dialogContent, setDialogContent] = useState(<></>);

    const sendBillEmailMutation = useMutation({
        mutationFn: sendBillEmailAction,
        onSuccess: (resp) => {
            if (resp.success) {
                // TODO! Alert
            } else {

            }
            setShowDialog(false);
        }
    });

    let generatePaymentsDialogContent = useCallback((activeData: typeof bills[0]) => (
        <>
            <Typography variant="h5" color="black" className="mb-4">Payment Details</Typography>
            <table className="w-full overflow-y-auto min-w-max table-auto text-left">
                <thead>
                <tr>
                    {["ID", "Date", "Total Payment Amount", "Allocated Amount", ""].map((el) => (
                        <th
                            key={el}
                            className="border-b border-blue-gray-100 bg-blue-gray-50 p-4"
                        >
                            <Typography
                                variant="small"
                                color="blue-gray"
                                className="font-normal leading-none opacity-70"
                            >
                                {el}
                            </Typography>
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {
                    activeData?.paymentBills &&
                    activeData.paymentBills.length > 0 ?
                        activeData.paymentBills
                            .map((pb, index, arr) => {
                                const isLast = index === arr.length - 1;
                                const classes = isLast ? "p-4" : "p-4 border-b border-blue-gray-50";

                                return (
                                    <tr key={pb.payment.id}>
                                        <td className={classes}>
                                            <Typography
                                                variant="small"
                                                color="blue-gray"
                                                className="font-normal"
                                            >
                                                {pb.payment.id}
                                            </Typography>
                                        </td>
                                        <td className={classes}>
                                            <Typography
                                                variant="small"
                                                color="blue-gray"
                                                className="font-normal"
                                            >
                                                {formatToDateTime(pb.payment.payment_date)}
                                            </Typography>
                                        </td>
                                        <td className={classes}>
                                            <Typography
                                                variant="small"
                                                color="blue-gray"
                                                className="font-normal"
                                            >
                                                {formatToIDR(new Prisma.Decimal(pb.payment.amount).toNumber())}
                                            </Typography>
                                        </td>
                                        <td className={classes}>
                                            <Typography
                                                variant="small"
                                                color="blue-gray"
                                                className="font-normal"
                                            >
                                                {formatToIDR(new Prisma.Decimal(pb.amount).toNumber())}
                                            </Typography>
                                        </td>
                                        <td className={classes}>
                                            <Link
                                                href={{
                                                    pathname: "/payments",
                                                    query: {
                                                        payment_id: pb.payment.id,
                                                    }
                                                }}
                                                className="font-normal"
                                            >
                                                <Typography
                                                    variant="small"
                                                    color="blue-gray"
                                                    className="font-normal"
                                                >
                                                    {"More Info"}
                                                </Typography>
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            }) :
                        <tr>
                            <td colSpan={100}>
                                <Typography>No Payment has been made</Typography>
                            </td>
                        </tr>
                }

                </tbody>
            </table>
            <div className={"flex gap-x-4 justify-end"}>
                <Button onClick={() => setShowDialog(false)} variant={"outlined"} className="mt-6">
                    Close
                </Button>
            </div>
        </>
    ), []);
    let generateEmailConfirmationDialogContent = useCallback((activeData: typeof bills[0]) => (
        <>
            <Typography variant="h5" color="black" className="mb-4">Send Bill Reminder</Typography>
            <Typography variant="paragraph" color="black">Are you sure you want to send this email?</Typography>
            <div className={"flex gap-x-4 justify-end"}>
                <Button onClick={() => setShowDialog(false)} variant={"outlined"} className="mt-6">
                    Close
                </Button>
                <Button onClick={() => {
                    if (activeData)
                        sendBillEmailMutation.mutate(activeData.id);
                }} color={"blue"} className="mt-6" loading={sendBillEmailMutation.isPending} >
                    Send
                </Button>
            </div>
        </>
    ), [sendBillEmailMutation]);

    const columnHelper = createColumnHelper<typeof bills[0]>();
    const columns = [
        columnHelper.accessor(row => row.id, {
            header: "ID",
        }),
        columnHelper.accessor(row => row.bookings.custom_id ?? row.bookings.id, {
            header: "Booking ID",
        }),
        columnHelper.accessor(row => row.description, {
            header: "Description",
            minSize: 275
        }),
        columnHelper.accessor(row => formatToIDR(new Prisma.Decimal(row.amount).toNumber()), {
            header: "Amount",
        }),
        columnHelper.accessor(row => {
            if (row.paymentBills) {
                return formatToIDR(row.paymentBills?.map(pb => new Prisma.Decimal(pb.amount).toNumber()).reduce((sum, curr) => sum + curr, 0));
            }
            return formatToIDR(0);
        }, {
            header: "Paid Amount",
        }),
        columnHelper.display({
            header: "Payments",
            cell: props =>
                <Link className={"text-blue-400"} type="button" href="" onClick={() => {
                    setDialogContent(generatePaymentsDialogContent(props.row.original));
                    setShowDialog(true);
                }}>View Payments</Link>
        }),
    ];

    if (!headerContext.locationID) {
        // @ts-ignore
        columns.splice(1, 0, columnHelper.accessor(row => row.bookings?.rooms?.locations.name ?? "", {
                header: "Location",
                size: 20
            })
        );
    }

    return (
        <div className={"p-8"}>
            <TableContent<typeof bills[0]>
                name={"Bookings"}
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
                                        setDialogContent(generateEmailConfirmationDialogContent(rowData));
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
                        size={"md"}
                        handler={() => setShowDialog(prev => !prev)}
                        className={"p-8"}
                    >
                        {dialogContent}
                    </Dialog>
                }
            />
        </div>
    );
}
