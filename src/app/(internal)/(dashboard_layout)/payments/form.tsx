"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import React, {useEffect, useMemo, useState} from "react";
import {Button, Input, Popover, PopoverContent, PopoverHandler, Typography} from "@material-tailwind/react";
import {useQuery} from "@tanstack/react-query";
import {SelectComponent, SelectOption} from "@/app/_components/input/select/select";
import {getLocations} from "@/app/_db/location";
import {ZodFormattedError} from "zod";
import {DayPicker} from "react-day-picker";
import {fileToBase64, formatToDateTime, formatToIDR} from "@/app/_lib/util";
import "react-day-picker/style.css";
import {getAllBookingsAction} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import {AnimatePresence, motion, MotionConfig} from "framer-motion";
import {PaymentIncludeAll} from "@/app/_db/payment";
import {AiOutlineLoading} from "react-icons/ai";
import {getPaymentStatusAction} from "@/app/(internal)/(dashboard_layout)/payments/payment-action";
import {NonUndefined} from "@/app/_lib/types";
import {
    BillIncludePaymentAndSum,
    getUnpaidBillsDueAction,
    simulateUnpaidBillPaymentAction
} from "@/app/(internal)/(dashboard_layout)/bills/bill-action";
import {Prisma} from "@prisma/client";
import {toast} from "react-toastify";
import CurrencyInput from "@/app/_components/input/currencyInput";

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
    let parsedData: typeof props.contentData;
    if (props.contentData) {
        parsedData = {
            ...props.contentData,
            amount: new Prisma.Decimal(props.contentData.amount),
        };
    }

    const [data, setData] = useState<DataType>(parsedData ?? {});
    const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<DataType> | undefined>(props.mutationResponse?.errors);
    const [locationID, setLocationID] = useState<number | undefined>(parsedData?.bookings.rooms?.location_id ?? undefined);
    const [popoverOpen, setIsPopoverOpen] = useState(false);

    const today = new Date();

    const [initialData, setInitialData] = useState<Partial<DataType>>(parsedData ?? {});
    // Function to compare initial and current booking data
    const hasChanges = (initialData: Partial<DataType>, currentData: Partial<DataType>) => {
        return JSON.stringify(initialData) !== JSON.stringify(currentData);
    };

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

    // Booking Data
    const {data: bookingData, isSuccess: isBookingDataSuccess} = useQuery({
        queryKey: ['bookings', 'location_id', locationID],
        queryFn: () => getAllBookingsAction(locationID),

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
        if (unpaidBillsDataSuccess) {
            let sum: Partial<BillIncludePaymentAndSum> = {
                amount: new Prisma.Decimal(0),
                sumPaidAmount: new Prisma.Decimal(0)
            };

            unpaidBillsData?.bills.forEach(ub => {
                sum.amount = sum.amount?.add(ub.amount) ?? new Prisma.Decimal(ub.amount);
                sum.sumPaidAmount = sum.sumPaidAmount?.add(ub.sumPaidAmount) ?? new Prisma.Decimal(ub.sumPaidAmount);
            });

            setTotalData(s => ({
                ...s,
                amount: sum.amount,
                sumPaidAmount: sum.sumPaidAmount,
            }));
        }
    }, [unpaidBillsDataSuccess, unpaidBillsData]);

    // Simulation Data
    const {data: simulationData, isSuccess: simulationDataSuccess, isLoading: simulationDataIsLoading} = useQuery({
        queryKey: ['payment.simulation', 'balance', data.amount, 'booking_id', data.booking_id],
        enabled: Boolean(data.amount && data.booking_id && data.payment_date && unpaidBillsDataSuccess),
        // @ts-expect-error billIncludeAll and BillIncludePaymentAndSum
        queryFn: () => simulateUnpaidBillPaymentAction(data.amount!.toNumber(), unpaidBillsData!.bills)
    });

    const [totalData, setTotalData] = useState<Partial<BillAndPayment>>({});

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

    // Use effect to set initialBookingData when the component mounts
    useEffect(() => {
        setInitialData(parsedData ?? {});
    }, [parsedData]);

    useEffect(() => {
        setFieldErrors(props.mutationResponse?.errors);
    }, [props.mutationResponse?.errors]);

    useEffect(() => {
        if (data.amount) {
            setTotalData(s => ({
                ...s,
                paymentAmount: data.amount,
                outstandingAmount: s.amount?.minus(s.sumPaidAmount ?? 0).minus(data.amount!)
            }));
        }
    }, [data.amount]);

    const isFormComplete = useMemo(() => {
        return !!data?.booking_id &&
            !!data?.payment_date &&
            !!data?.status_id &&
            !!data?.amount &&
            !!data?.payment_date;
    }, [data]);

    let amountError =
        !!fieldErrors?.amount ||
        data.amount?.greaterThan(unpaidBillsData?.total ?? Infinity);

    return (
        <div className={"w-full px-8 py-4"}>
            <h1 className={"text-xl font-semibold text-black"}>{parsedData ? "Perubahan" : "Pembuatan"} Pembayaran</h1>
            <form className={"mt-4"}>
                <div className="mb-1 flex flex-col gap-6">
                    <MotionConfig
                        key={"payment_form"}
                        transition={{duration: 0.5}}
                    >
                        <AnimatePresence>
                            <div>
                                <label htmlFor="location">
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
                            <div>
                                <label htmlFor="status_id">
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
                                        <Typography variant="h6" color="blue-gray">
                                            Pemesanan
                                        </Typography>
                                    </label>
                                    <SelectComponent<number>
                                        setValue={(v) => setData(prevState => ({...prevState, booking_id: v}))}
                                        options={bookingDataMapped}
                                        selectedOption={bookingDataMapped.find(r => r.value == data?.bookings?.id)}
                                        placeholder={"Pilih Pemesanan"}
                                        isError={!!fieldErrors?.booking_id}
                                    />
                                    {
                                        fieldErrors?.booking_id &&
                                        <Typography color="red">{fieldErrors?.booking_id._errors}</Typography>
                                    }
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
                                        <Typography variant="h6" color="blue-gray">
                                            Penyewa
                                        </Typography>
                                    </label>
                                    {
                                        data.booking_id &&
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
                                    }
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
                                    {
                                        data.amount?.greaterThan(unpaidBillsData?.total || Infinity) &&
                                        <Typography color="red">Jumlah Pembayaran Melebihi Total Tagihan</Typography>
                                    }
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
                                        <Typography variant="h6" color="blue-gray">
                                            Tanggal Pembayaran
                                        </Typography>
                                    </label>
                                    <Popover
                                        open={popoverOpen}
                                        handler={() => setIsPopoverOpen(p => !p)}
                                        placement="bottom-end"
                                    >
                                        <PopoverHandler>
                                            <Input
                                                variant="outlined"
                                                size="lg"
                                                onChange={() => null}
                                                value={data.payment_date ? formatToDateTime(data.payment_date, true, true) : ""}
                                                error={!!fieldErrors?.payment_date}
                                                className={`relative ${!!fieldErrors?.payment_date ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                                labelProps={{
                                                    className: "before:content-none after:content-none",
                                                }}
                                            />
                                        </PopoverHandler>
                                        <PopoverContent className={"z-[99999]"}>
                                            <DayPicker
                                                captionLayout="dropdown"
                                                mode="single"
                                                fixedWeeks={true}
                                                selected={data.payment_date ? data.payment_date : new Date()}
                                                onSelect={(d) => {
                                                    setIsPopoverOpen(false);
                                                    setData(p => ({...p, payment_date: d}));
                                                }}
                                                showOutsideDays
                                                classNames={{
                                                    disabled: "rdp-disabled cursor-not-allowed",
                                                }}
                                                startMonth={new Date(today.getFullYear() - 5, today.getMonth())}
                                                endMonth={new Date(today.getFullYear() + 5, today.getMonth())}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {
                                        fieldErrors?.payment_date &&
                                        <Typography color="red">{fieldErrors?.payment_date._errors}</Typography>
                                    }
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
                                    <Typography variant="h6" color="blue-gray">
                                        Tagihan
                                    </Typography>
                                    {
                                        (unpaidBillsDataIsLoading || simulationDataIsLoading) &&
                                        <span className={"mx-auto h-8 w-8"}><AiOutlineLoading className="animate-spin"/></span>
                                    }
                                    {
                                        unpaidBillsDataSuccess &&
                                        <div className={"flex flex-col"}>
                                            {unpaidBillsData?.bills.map((ub, index, arr) => {
                                                const newData = simulationData?.new.payments.find(p => p.bill_id == ub.id);
                                                const due = Number(ub.amount) - Number(ub.sumPaidAmount);
                                                return (
                                                    <div key={ub.id}
                                                         className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid gap-x-4 grid-cols-7 grid-rows-2 items-center">
                                <span
                                    className="col-start-1 col-span-full row-start-1 row-span-1 text-gray-800 text-lg font-semibold">Tagihan #{ub.id} (Jatuh Tempo {formatToDateTime(ub.due_date, false)})</span>
                                                        {/* Existing Information Column */}
                                                        <div className="flex flex-col text-sm col-span-3 row-start-2">
                                                            <p className="text-gray-700">Jumlah: <span
                                                                className="font-bold">{formatToIDR(Number(ub.amount))}</span>
                                                            </p>
                                                            <p className="text-gray-700">Terbayar: <span
                                                                className="font-bold">{formatToIDR(Number(ub.sumPaidAmount))}</span>
                                                            </p>
                                                            <p className="text-gray-700">Belum Dibayar: <span
                                                                className="font-bold text-red-600">{formatToIDR(due)}</span>
                                                            </p>
                                                        </div>

                                                        {
                                                            simulationDataSuccess ?
                                                                <>
                                                                    {/* Separator */}
                                                                    <div
                                                                        className="flex justify-center items-center row-start-2 text-gray-400">
                                                                        {/*{index === Math.floor(arr.length / 2) ? '>' : <>&nbsp;</>}*/}
                                                                        <Typography variant={"h4"}>&gt;</Typography>
                                                                    </div>

                                                                    {/* New Information Column */}
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
                                                                </> :
                                                                <>
                                                                    <div></div>
                                                                    <div></div>
                                                                </>
                                                        }
                                                    </div>
                                                );
                                            })}
                                            {/*Total Data Display*/}
                                            <div
                                                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid gap-x-4 grid-cols-7 grid-rows-2 items-center">
                                                {/* Existing Information Column */}
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

                                                {/* Separator */}
                                                <div
                                                    className="flex justify-center items-center text-gray-400 row-start-2">
                                                    <Typography variant={"h4"}>&gt;</Typography>
                                                </div>

                                                {/* New Information Column */}
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
                            {
                                props.mutationResponse?.failure &&
                                <Typography variant="h6" color="red" className="-mb-4">
                                    {props.mutationResponse.failure}
                                </Typography>
                            }
                        </AnimatePresence>
                    </MotionConfig>
                </div>

                <div className={"flex gap-x-4 justify-end"}>
                    <Button onClick={() => props.setDialogOpen(false)} variant={"outlined"} className="mt-6">
                        Batal
                    </Button>
                    <Button disabled={!isFormComplete || !hasChanges(initialData, data)}
                            onClick={() => props.mutation.mutate(data)}
                            color={"blue"} className="mt-6"
                            loading={props.mutation.isPending}>
                        {parsedData ? "Ubah" : "Buat"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

