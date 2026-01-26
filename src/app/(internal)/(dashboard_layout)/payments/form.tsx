"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import React, {useEffect, useMemo, useState} from "react";
import {Button, Input, Radio, Typography} from "@material-tailwind/react";
import {useQuery} from "@tanstack/react-query";
import {SelectComponent, SelectOption} from "@/app/_components/input/select";
import {getLocations} from "@/app/_db/location";
import {ZodFormattedError} from "zod";
import {DatePicker} from "@/app/_components/DateRangePicker";
import {fileToBase64, formatToDateTime, formatToIDR} from "@/app/_lib/util";
import {getBookingsWithUnpaidBillsAction} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import {AnimatePresence, motion, MotionConfig} from "framer-motion";
import {PaymentIncludeAll} from "@/app/_db/payment";
import {AiOutlineLoading} from "react-icons/ai";
import {getPaymentStatusAction} from "@/app/(internal)/(dashboard_layout)/payments/payment-action";
import {NonUndefined} from "@/app/_lib/types";
import {
    BillIncludePaymentAndSum,
    getUnpaidBillsDueAction,
    simulateUnpaidBillPaymentAction,
    simulateUnpaidBillPaymentActionWithExcludePayment
} from "@/app/(internal)/(dashboard_layout)/bills/bill-action";
import {Prisma} from "@prisma/client";
import {toast} from "react-toastify";
import CurrencyInput from "@/app/_components/input/currencyInput";

// TODO! Separate deposit field

interface PaymentForm extends TableFormProps<PaymentIncludeAll> {
}

type DataType = Partial<NonUndefined<PaymentForm['contentData']>> & {
    payment_proof_file?: {
        fileName: string,
        fileType: string,
        b64File: string
    }
};

type BillAndPayment = BillIncludePaymentAndSum & {
    paymentAmount: Prisma.Decimal
    outstandingAmount: Prisma.Decimal
};

export function PaymentForm(props: PaymentForm) {
    const parsedData = useMemo(() => {
        if (props.contentData) {
            return {
                ...props.contentData,
                amount: new Prisma.Decimal(props.contentData.amount),
            };
        }
        return undefined;
    }, [props.contentData]);

    const [data, setData] = useState<DataType>({});
    const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<DataType> | undefined>(props.mutationResponse?.errors);
    const [locationID, setLocationID] = useState<number | undefined>(undefined);


    const today = new Date();

    const [initialData, setInitialData] = useState<Partial<DataType>>({});
    const [initialAllocationMode, setInitialAllocationMode] = useState<'auto' | 'manual'>('auto');
    const [initialManualAllocations, setInitialManualAllocations] = useState<Record<number, number>>({});

    const [allocationMode, setAllocationMode] = useState<'auto' | 'manual'>('auto');
    const [manualAllocations, setManualAllocations] = useState<Record<number, number>>({});

    // Initialize data when parsedData changes
    useEffect(() => {
        if (parsedData) {
            setData(parsedData);
            setLocationID(parsedData.bookings?.rooms?.location_id ?? undefined);
            setInitialData(parsedData);
        }
    }, [parsedData]);

    // Function to compare initial and current booking data
    const hasChanges = useMemo(() => {
        const dataChanged =
            initialData?.booking_id !== data?.booking_id ||
            initialData?.payment_date?.getTime() !== data?.payment_date?.getTime() ||
            initialData?.status_id !== data?.status_id ||
            initialData?.amount?.toNumber() !== data?.amount?.toNumber();
        const allocationModeChanged = initialAllocationMode !== allocationMode;
        const manualAllocationsChanged = JSON.stringify(initialManualAllocations) !== JSON.stringify(manualAllocations);

        return dataChanged || allocationModeChanged || manualAllocationsChanged;
    }, [
        initialData?.booking_id,
        initialData?.payment_date,
        initialData?.status_id,
        initialData?.amount?.toNumber(),
        data?.booking_id,
        data?.payment_date,
        data?.status_id,
        data?.amount?.toNumber(),
        initialAllocationMode,
        allocationMode,
        initialManualAllocations,
        manualAllocations
    ]);

    // Set initial allocation states when component mounts
    useEffect(() => {
        setInitialAllocationMode(allocationMode);
        setInitialManualAllocations(manualAllocations);
    }, []); // Only run once on mount

    // Location Data
    const {data: locationData, isSuccess: locationDataSuccess} = useQuery({
        queryKey: ['header.location'],
        queryFn: () => getLocations(),
    });

    const [locationDataMapped, setLocationDataMapped] = useState<SelectOption<number>[]>([]);
    useEffect(() => {
        if (locationDataSuccess) {
            setLocationDataMapped(locationData.map(e => ({
                value: e.id,
                label: `${e.name}`,
            })));
        }
    }, [locationData, locationDataSuccess]);

    // Booking Data - Only get bookings with unpaid bills
    const {data: bookingData, isSuccess: isBookingDataSuccess} = useQuery({
        queryKey: ['bookings.with.unpaid.bills', 'location_id', locationID],
        queryFn: () => getBookingsWithUnpaidBillsAction(locationID),

        enabled: locationID != undefined,
    });
    const [bookingDataMapped, setBookingDataMapped] = useState<SelectOption<number>[]>([]);
    useEffect(() => {
        if (isBookingDataSuccess) {
            setBookingDataMapped(bookingData.map(r => ({
                value: r.id,
                label: `Pemessanan ${r.id} | Kamar ${r.rooms?.room_number}`,
            })));
        }
    }, [bookingData, isBookingDataSuccess]);

    // Status Data
    const {data: statusData, isSuccess: statusDataSuccess} = useQuery({
        queryKey: ['payment.status'],
        queryFn: () => getPaymentStatusAction(),
    });
    const [statusDataMapped, setStatusDataMapped] = useState<SelectOption<number>[]>([]);
    useEffect(() => {
        if (statusDataSuccess) {
            setStatusDataMapped(statusData.map(e => ({
                value: e.id,
                label: e.status,
            })));
        }
    }, [statusData, statusDataSuccess]);

    // Unpaid Bills Data
    let {data: unpaidBillsData, isSuccess: unpaidBillsDataSuccess, isLoading: unpaidBillsDataIsLoading} = useQuery({
        queryKey: ['bills.unpaid', 'booking_id', data.booking_id],
        enabled: Boolean(data.booking_id && isBookingDataSuccess),
        queryFn: () => getUnpaidBillsDueAction(data.booking_id!)
    });
    useEffect(() => {
        if (unpaidBillsDataSuccess && unpaidBillsData) {
            let sum: typeof totalData = {
                amount: new Prisma.Decimal(0),
                sumPaidAmount: new Prisma.Decimal(0)
            };

            unpaidBillsData.bills = unpaidBillsData.bills.map(ub => {
                const amount = ub.bill_item.reduce(
                    (acc, bi) => acc.add(bi.amount), new Prisma.Decimal(0)
                );
                sum.amount = sum.amount?.add(amount) ?? new Prisma.Decimal(amount);
                sum.sumPaidAmount = sum.sumPaidAmount?.add(ub.sumPaidAmount) ?? new Prisma.Decimal(ub.sumPaidAmount);
                return {
                    ...ub,
                    amount // ensure amount is set
                };
            });

            setTotalData(s => ({
                ...s,
                amount: sum.amount,
                sumPaidAmount: sum.sumPaidAmount,
                paymentAmount: data.amount,
                outstandingAmount: sum.amount?.minus(sum.sumPaidAmount ?? 0).minus(data.amount ?? 0)
            }));
        }
    }, [unpaidBillsDataSuccess, unpaidBillsData, data.amount?.toNumber()]);

    // Simulation Data
    const isEditMode = Boolean(parsedData && parsedData.id);
    const paymentIdToExclude = parsedData?.id;
    const {data: simulationData, isSuccess: simulationDataSuccess, isLoading: simulationDataIsLoading} = useQuery({
        queryKey: ['payment.simulation', 'balance', data.amount?.toNumber(), 'booking_id', data.booking_id, isEditMode ? paymentIdToExclude : undefined],
        enabled: Boolean(data.amount && data.booking_id && data.payment_date && unpaidBillsDataSuccess),
        queryFn: async () => {
            let amount = new Prisma.Decimal(data.amount!);
            if (isEditMode && paymentIdToExclude) {
                // Exclude the current payment from the simulation
                return simulateUnpaidBillPaymentActionWithExcludePayment(amount.toNumber(), data.booking_id!, paymentIdToExclude);
            } else {
                // @ts-expect-error invalid type BillIncludeAll and BillIncludePaymentAndSum
                return simulateUnpaidBillPaymentAction(amount.toNumber(), unpaidBillsData!.bills);
            }
        }
    });

    const [totalData, setTotalData] = useState<Partial<BillAndPayment & { amount: Prisma.Decimal }>>({});

    const [image, setImage] = useState<File | undefined>(undefined);
    useEffect(() => {
        if (image) {
            fileToBase64(image)
                .then((b64String): void => {
                    setData(d => ({
                        ...d,
                        payment_proof_file: {
                            fileName: image.name,
                            fileType: image.type,
                            b64File: b64String ?? ""
                        }
                    }));
                });
        } else {
            setData(d => ({
                ...d,
                payment_proof_file: undefined
            }));
        }
    }, [image]);


    useEffect(() => {
        setFieldErrors(props.mutationResponse?.errors);
    }, [props.mutationResponse?.errors]);

    const isFormComplete = useMemo(() => {
        return !!data?.booking_id &&
            !!data?.payment_date &&
            !!data?.status_id &&
            !!data?.amount &&
            !!data?.payment_date;
    }, [data?.booking_id, data?.payment_date, data?.status_id, data?.amount?.toNumber()]);

    // Add a check for any over-allocated bill in manual mode
    const anyOverAllocated = useMemo(() => {
        if (allocationMode !== 'manual') return false;

        // Use simulation data if available (for edit mode), otherwise use unpaid bills data
        const billsToCheck = simulationDataSuccess ? simulationData?.old.bills : unpaidBillsData?.bills;

        return billsToCheck?.some(ub => {
            const due = Number((ub as any).amount) - Number(ub.sumPaidAmount);
            const allocated = Number(manualAllocations[ub.id]) || 0;
            return allocated > due;
        }) ?? false;
    }, [allocationMode, simulationDataSuccess, simulationData?.old.bills, unpaidBillsData?.bills, manualAllocations]);

    return (
        <div className={"w-full px-8 py-4"}>
            <h1 className={"text-xl font-semibold text-black"}>{(parsedData && parsedData.id) ? "Perubahan" : "Pembuatan"} Pembayaran</h1>
            <form className={"mt-4"}>
                <div className="mb-1 flex flex-col gap-6">
                    <MotionConfig
                        key={"payment_form"}
                        transition={{duration: 0.5}}
                    >
                        <AnimatePresence key={"payment_form_animate_presence"}>
                            <div key={"location"}>
                                <label htmlFor="location">
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Typography variant="h6" color="blue-gray">
                                        Lokasi
                                    </Typography>
                                </label>
                                <SelectComponent<number>
                                    setValue={(v) => setLocationID(v)}
                                    options={locationDataMapped}
                                    selectedOption={
                                        locationDataMapped.find(r => r.value == locationID)
                                    }
                                    placeholder={"Masukan Lokasi"}
                                    isError={false}
                                />
                            </div>
                            <div key={"status_id"}>
                                <label htmlFor="status_id">
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Typography variant="h6" color="blue-gray">
                                        Status
                                    </Typography>
                                </label>
                                <SelectComponent<number>
                                    setValue={(v) => setData(prevState => ({...prevState, status_id: v}))}
                                    options={statusDataMapped}
                                    selectedOption={statusDataMapped.find(r => r.value == data?.status_id)}
                                    placeholder={"Pilih Status"}
                                    isError={!!fieldErrors?.status_id}
                                />
                                {
                                    fieldErrors?.status_id &&
                                    // @ts-expect-error weird react 19 types error
                                    <Typography color="red">{fieldErrors?.status_id._errors}</Typography>
                                }
                            </div>

                            {
                                locationID && data?.status_id &&
                                <motion.div
                                    key={"booking_id"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    <label htmlFor="booking_id">
                                        {/* @ts-expect-error weird react 19 types error */}
                                        <Typography variant="h6" color="blue-gray">
                                            Pemesanan (Hanya yang memiliki tagihan belum lunas)
                                        </Typography>
                                    </label>
                                    <SelectComponent<number>
                                        setValue={(v) => setData(prevState => ({...prevState, booking_id: v}))}
                                        options={bookingDataMapped}
                                        selectedOption={bookingDataMapped.find(r => r.value == data?.bookings?.id)}
                                        placeholder={"Pilih Pemesanan dengan tagihan belum lunas"}
                                        isError={!!fieldErrors?.booking_id}
                                    />
                                    {fieldErrors?.booking_id && (
                                        <>
                                            {/* @ts-expect-error weird react 19 types error */}
                                            <Typography color="red">{fieldErrors?.booking_id._errors}</Typography>
                                        </>
                                    )}
                                </motion.div>

                            }
                            {
                                data?.booking_id &&
                                <motion.div
                                    key={"tenant_id"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    <label htmlFor="tenant_id">
                                        {/* @ts-expect-error weird react 19 types error */}
                                        <Typography variant="h6" color="blue-gray">
                                            Penyewa
                                        </Typography>
                                    </label>
                                    {data.booking_id && (
                                        <>
                                            {/* @ts-expect-error weird react 19 types error */}
                                            <Input
                                            value={((): string => {
                                                let tenant = bookingData?.find(b => b.id == data.booking_id)?.tenants;
                                                if (tenant) {
                                                    return `${tenant.name} | ${tenant.phone}`;
                                                }

                                                return "";
                                            })()}
                                            disabled={true}
                                            size="lg"
                                            className={"!border-t-blue-gray-200 focus:!border-t-gray-900"}
                                            labelProps={{
                                                className: "before:content-none after:content-none",
                                            }}
                                            />
                                        </>
                                    )}
                                </motion.div>
                            }
                            {
                                data?.booking_id && unpaidBillsDataSuccess &&
                                <motion.div
                                    key={"allocation_mode"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    <div className="mt-4">
                                        {/* @ts-expect-error weird react 19 types error */}
                                        <Typography variant="h6" color="blue-gray">Metode Alokasi
                                            Pembayaran</Typography>
                                        <div className="flex gap-4 mt-2">
                                            {/* @ts-expect-error weird react 19 types error */}
                                            <Radio id="auto" name="allocationMode" label="Otomatis"
                                                   checked={allocationMode === 'auto'}
                                                   onChange={() => setAllocationMode('auto')}/>
                                            {/* @ts-expect-error weird react 19 types error */}
                                            <Radio id="manual" name="allocationMode" label="Manual"
                                                   checked={allocationMode === 'manual'}
                                                   onChange={() => setAllocationMode('manual')}/>
                                        </div>
                                    </div>
                                </motion.div>
                            }
                            {
                                data?.booking_id && unpaidBillsDataSuccess &&
                                <motion.div
                                    key={"payment_amount"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    <label htmlFor="payment_amount">
                                        {/* @ts-expect-error weird react 19 types error */}
                                        <Typography variant="h6" color="blue-gray">
                                            Jumlah Pembayaran
                                        </Typography>
                                    </label>
                                    <CurrencyInput
                                        value={data.amount?.toNumber()}
                                        setValue={(newValue) => {
                                            setData((old) => ({
                                                ...old,
                                                amount: newValue == undefined ? undefined : new Prisma.Decimal(newValue)
                                            }));
                                        }}
                                        size="lg"
                                        error={!!fieldErrors?.amount}
                                        className={`${!!fieldErrors?.amount ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                        labelProps={{
                                            className: "before:content-none after:content-none",
                                        }}
                                    />
                                    {data.amount?.greaterThan(unpaidBillsData?.total || Infinity) && (
                                        <>
                                            {/* @ts-expect-error weird react 19 types error */}
                                            <Typography color="red">Jumlah Pembayaran Melebihi Total Tagihan</Typography>
                                        </>
                                    )}
                                </motion.div>
                            }
                            {
                                data?.amount &&
                                <motion.div
                                    key={"payment_date"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    <label htmlFor="payment_date">
                                        {/* @ts-expect-error weird react 19 types error */}
                                        <Typography variant="h6" color="blue-gray">
                                            Tanggal Pembayaran
                                        </Typography>
                                    </label>
                                    <DatePicker
                                        mode="single"
                                        placeholder="Pilih tanggal pembayaran"
                                        showSearchButton={false}
                                        initialDate={{
                                            singleDate: data.payment_date
                                        }}
                                        onUpdate={(dateData) => {
                                            if (dateData.singleDate) {
                                                setData(p => ({...p, payment_date: dateData.singleDate}));
                                            }
                                        }}
                                    />
                                    {fieldErrors?.payment_date && (
                                        <>
                                            {/* @ts-expect-error weird react 19 types error */}
                                            <Typography color="red">{fieldErrors?.payment_date._errors}</Typography>
                                        </>
                                    )}
                                </motion.div>
                            }
                            {
                                data.booking_id &&
                                <motion.div
                                    key={"bills"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Typography variant="h6" color="blue-gray">
                                        Tagihan
                                    </Typography>
                                    {
                                        (unpaidBillsDataIsLoading || simulationDataIsLoading) &&
                                        <span className={"mx-auto h-8 w-8"}><AiOutlineLoading
                                            className="animate-spin"/></span>
                                    }
                                    {
                                        allocationMode === 'auto' && simulationDataSuccess &&
                                        <div className={"flex flex-col"}>
                                            {simulationData?.old.bills.map((ub, index, arr) => {
                                                const newData = simulationData?.new.payments.find(p => p.bill_id == ub.id);
                                                const due = Number((ub as any).amount) - Number(ub.sumPaidAmount);
                                                return (
                                                    <div key={ub.id}
                                                         className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid gap-x-4 grid-cols-7 grid-rows-2 items-center">
                                                        <span
                                                            className="col-start-1 col-span-full row-start-1 row-span-1 text-gray-800 text-lg font-semibold">Tagihan #{ub.id} (Jatuh Tempo {formatToDateTime(ub.due_date, false)})</span>
                                                        <div className="flex flex-col text-sm col-span-3 row-start-2">
                                                            <p className="text-gray-700">Jumlah: <span
                                                                className="font-bold">{formatToIDR(Number((ub as any).amount))}</span>
                                                            </p>
                                                            <p className="text-gray-700">Terbayar: <span
                                                                className="font-bold">{formatToIDR(Number(ub.sumPaidAmount))}</span>
                                                            </p>
                                                            <p className="text-gray-700">Belum Dibayar: <span
                                                                className="font-bold text-red-600">{formatToIDR(due)}</span>
                                                            </p>
                                                        </div>
                                                        <div
                                                            className="flex justify-center items-center row-start-2 text-gray-400">
                                                            {/* @ts-expect-error weird react 19 types error */}
                                                            <Typography variant={"h4"}>&gt;</Typography>
                                                        </div>
                                                        <div
                                                            className="flex flex-col text-sm self-end row-start-2 col-span-3">
                                                            <p className="text-gray-700">Pembayaran
                                                                Sekarang: <span
                                                                    className="font-bold">{formatToIDR(Number(newData?.amount) || 0)}</span>
                                                            </p>
                                                            <p className="text-gray-700">Jumlah Belum
                                                                Dibayar: <span
                                                                    className="font-bold text-red-600">{formatToIDR((due - (Number(newData?.amount) || 0)))}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div
                                                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid gap-x-4 grid-cols-7 grid-rows-2 items-center">
                                                <span
                                                    className="col-start-1 col-span-full row-start-1 row-span-1 text-gray-800 text-lg font-semibold">Total Tagihan</span>
                                                <div className="flex flex-col text-sm col-span-3 row-start-2">
                                                    <p className="text-gray-700">Jumlah: <span
                                                        className="font-bold">{formatToIDR(Number(totalData.amount))}</span>
                                                    </p>
                                                    <p className="text-gray-700">Terbayar: <span
                                                        className="font-bold">{formatToIDR(Number(totalData.sumPaidAmount))}</span>
                                                    </p>
                                                    <p className="text-gray-700">Belum Dibayar: <span
                                                        className="font-bold text-red-600">{formatToIDR(Number(totalData.amount) - Number(totalData.sumPaidAmount))}</span>
                                                    </p>
                                                </div>
                                                <div
                                                    className="flex justify-center items-center text-gray-400 row-start-2">
                                                    {/* @ts-expect-error weird react 19 types error */}
                                                    <Typography variant={"h4"}>&gt;</Typography>
                                                </div>
                                                <div className="flex flex-col text-sm self-end col-span-3 row-start-2">
                                                    <p className="text-gray-700">Pembayaran Sekarang: <span
                                                        className="font-bold">{formatToIDR(Number(totalData.paymentAmount))}</span>
                                                    </p>
                                                    <p className="text-gray-700">Jumlah Belum Dibayar: <span
                                                        className="font-bold text-red-600">{formatToIDR(Number(totalData.outstandingAmount))}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    }
                                    {
                                        allocationMode === 'manual' && simulationDataSuccess &&
                                        <div className={"flex flex-col"}>
                                            {simulationData?.old.bills.map((ub, index, arr) => {
                                                const due = Number((ub as any).amount) - Number(ub.sumPaidAmount);
                                                const allocated = Number(manualAllocations[ub.id]) || 0;
                                                const overAllocated = allocated > due;
                                                return (
                                                    <div key={ub.id}
                                                         className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid gap-x-4 grid-cols-7 grid-rows-2 items-center">
                                                        <span
                                                            className="col-start-1 col-span-full row-start-1 row-span-1 text-gray-800 text-lg font-semibold">Tagihan #{ub.id} (Jatuh Tempo {formatToDateTime(ub.due_date, false)})</span>
                                                        <div className="flex flex-col text-sm col-span-3 row-start-2">
                                                            <p className="text-gray-700">Jumlah: <span
                                                                className="font-bold">{formatToIDR(Number((ub as any).amount))}</span>
                                                            </p>
                                                            <p className="text-gray-700">Terbayar: <span
                                                                className="font-bold">{formatToIDR(Number(ub.sumPaidAmount))}</span>
                                                            </p>
                                                            <p className="text-gray-700">Belum Dibayar: <span
                                                                className="font-bold text-red-600">{formatToIDR(due)}</span>
                                                            </p>
                                                        </div>
                                                        <div
                                                            className="flex justify-center items-center row-start-2 text-gray-400">
                                                            {/* @ts-expect-error weird react 19 types error */}
                                                            <Typography variant={"h4"}>&gt;</Typography>
                                                        </div>
                                                        <div
                                                            className="flex flex-col text-sm self-end row-start-2 col-span-3">
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className="text-gray-700">Pembayaran Sekarang:</span>
                                                                <CurrencyInput
                                                                    value={manualAllocations[ub.id] ?? ''}
                                                                    setValue={val => {
                                                                        setManualAllocations(prev => ({
                                                                            ...prev,
                                                                            [ub.id]: val ?? 0
                                                                        }));
                                                                    }}
                                                                    error={overAllocated}
                                                                    className={`w-32 ${overAllocated ? '!border-t-red-500' : ''}`}
                                                                />
                                                            </div>
                                                            {overAllocated && (
                                                                // @ts-expect-error weird react 19 types error
                                                                <Typography color="red" variant="small">Nilai melebihi
                                                                    sisa tagihan!</Typography>
                                                            )}
                                                            <p className="text-gray-700">Jumlah Belum Dibayar: <span
                                                                className="font-bold text-red-600">{formatToIDR(due - allocated)}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div className="mt-2">
                                                {/* @ts-expect-error weird react 19 types error */}
                                                <Typography variant="small">Total Dialokasikan: <span
                                                    className="font-bold">{formatToIDR(Object.values(manualAllocations).reduce((a, b) => a + (Number(b) || 0), 0))}</span></Typography>
                                                {/* @ts-expect-error weird react 19 types error */}
                                                <Typography variant="small">Jumlah Pembayaran: <span
                                                    className="font-bold">{formatToIDR(Number(data.amount) || 0)}</span></Typography>
                                                {Object.values(manualAllocations).reduce((a, b) => a + (Number(b) || 0), 0) !== Number(data.amount) && (
                                                    // @ts-expect-error weird react 19 types error
                                                    <Typography color="red">Total alokasi harus sama dengan jumlah
                                                        pembayaran!</Typography>
                                                )}
                                            </div>
                                        </div>
                                    }
                                </motion.div>
                            }
                            {
                                data.payment_proof ?
                                    <></> :
                                    data.payment_date &&
                                    <motion.div
                                        key={"payment_proof_upload"}
                                        initial={{opacity: 0, height: 0}}
                                        animate={{opacity: 1, height: "auto"}}
                                        exit={{opacity: 0, height: 0}}
                                    >
                                        <label htmlFor="payment_date">
                                            {/* @ts-expect-error weird react 19 types error */}
                                            <Typography variant="h6" color="blue-gray">
                                                Payment Proof Upload (Optional)
                                            </Typography>
                                        </label>
                                        <input type="file" accept="image/png, image/jpg, image/jpeg, image/webp"
                                               onChange={(e) => {
                                                   const file = e.target.files?.[0];
                                                   if (file?.size && file?.size > 2048000) {
                                                       toast.error("Ukuran Gambar Terlalu Besar");
                                                       e.target.value = "";
                                                   } else {
                                                       setImage(file);
                                                   }
                                               }}
                                               className="w-full font-semibold text-sm bg-white border file:cursor-pointer cursor-pointer file:border-0 file:py-3 file:px-4 file:mr-4 file:bg-gray-100 file:hover:bg-gray-200 file:text-gray-500 rounded"/>
                                        <p className="text-xs mt-2">PNG, JPG, JPEG, WEBP diperbolehkan. Ukuran maksimum
                                            gambar adalah 2MB</p>
                                    </motion.div>
                            }
                            {props.mutationResponse?.failure && (
                                <>
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Typography variant="h6" color="red" className="-mb-4">
                                        {props.mutationResponse.failure}
                                    </Typography>
                                </>
                            )}
                        </AnimatePresence>
                    </MotionConfig>
                </div>

                <div className={"flex gap-x-4 justify-end"}>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Button onClick={() => props.setDialogOpen(false)} variant={"outlined"} className="mt-6">
                        Batal
                    </Button>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Button
                        disabled={
                            !isFormComplete ||
                            !hasChanges ||
                            (
                                allocationMode === 'manual' &&
                                (
                                    Object.values(manualAllocations).reduce((a, b) => a + (Number(b) || 0), 0) !==
                                    Number(data.amount) ||
                                    anyOverAllocated
                                )
                            )
                        }
                        onClick={() => props.mutation.mutate({
                            ...(data as any), // type assertion to allow extra fields
                            allocationMode,
                            manualAllocations: allocationMode === 'manual' ? Object.fromEntries(Object.entries(manualAllocations).filter(([_, v]) => Number(v) > 0)) : undefined
                        })}
                        color={"blue"} className="mt-6"
                        loading={props.mutation.isPending}>
                        {isEditMode ? "Ubah" : "Buat"}
                    </Button>
                </div>
            </form>
        </div>
    )
        ;
}

