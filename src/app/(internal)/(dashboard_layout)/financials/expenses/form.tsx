"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import React, {useEffect, useMemo, useState} from "react";
import {Button, Input, Typography} from "@material-tailwind/react";
import {useQuery} from "@tanstack/react-query";
import {SelectComponent, SelectOption} from "@/app/_components/input/select";
import {getLocations} from "@/app/_db/location";
import {getAllBookingsAction} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import {ZodFormattedError} from "zod";
import {DatePicker} from "@/app/_components/DateRangePicker";
import {AnimatePresence, motion, MotionConfig} from "framer-motion";
import {NonUndefined} from "@/app/_lib/types";
import {Prisma, TransactionType} from "@prisma/client";
import CurrencyInput from "@/app/_components/input/currencyInput";
import {useHeader} from "@/app/_context/HeaderContext";
import {getTransactions, TransactionWithBookingInfo} from "@/app/_db/transaction";

interface ExpenseFormProps extends TableFormProps<TransactionWithBookingInfo> {
}

type DataType = Partial<NonUndefined<ExpenseFormProps['contentData']>> & {
    booking_id?: number;
};

export function ExpenseForm(props: ExpenseFormProps) {
    let parsedData: typeof props.contentData;
    if (props.contentData) {
        parsedData = {
            ...props.contentData,
            type: TransactionType.EXPENSE
        };
    }

    const headerContext = useHeader();

    const [data, setData] = useState<DataType>(parsedData ?? {
        type: TransactionType.EXPENSE
    });
    const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<DataType> | undefined>(props.mutationResponse?.errors);


    const today = new Date();

    const [initialData, setInitialData] = useState<Partial<DataType>>(parsedData ?? {
        type: TransactionType.EXPENSE
    });
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
        queryKey: ['bookings', 'location_id', data.location_id],
        queryFn: () => getAllBookingsAction(data.location_id),
        enabled: data.location_id != undefined,
    });
    const [bookingDataMapped, setBookingDataMapped] = useState<SelectOption<number>[]>([]);
    useEffect(() => {
        if (isBookingDataSuccess && bookingData) {
            setBookingDataMapped(bookingData.map(e => ({
                value: e.id,
                label: `Booking #${e.id} - ${e.rooms?.room_number || 'N/A'} - ${e.tenants?.name || 'N/A'}`,
            })));
        }
    }, [bookingData, isBookingDataSuccess]);

    // Location Data
    const {data: expenseCategory, isSuccess: expenseCategorySuccess} = useQuery({
        queryKey: ['expense.category', headerContext.locationID],
        queryFn: () => getTransactions({
            where: {
                location_id: headerContext.locationID,
                type: TransactionType.EXPENSE,
            },
            select: {
                category: true
            },
            distinct: ['category']
        }),
    });

    const [expenseCategoryMapped, setExpenseCategoryMapped] = useState<SelectOption<string>[]>([]);
    useEffect(() => {
        if (expenseCategorySuccess && expenseCategory) {
            setExpenseCategoryMapped(
                expenseCategory
                    .filter(e => e.category != null)
                    .map(e => ({
                        value: e.category!,
                        label: `${e.category}`,
                    }))
            );
        }
    }, [expenseCategory, expenseCategorySuccess]);


    useEffect(() => {
        setFieldErrors(props.mutationResponse?.errors);
    }, [props.mutationResponse?.errors]);

    const isFormComplete = useMemo(() => {
        return (
            !!data?.location_id &&
            !!data?.amount &&
            !!data?.date
        );
    }, [data]);


    return (
        <div className={"w-full px-8 py-4"}>
            <h1 className={"text-xl font-semibold text-black"}>{(parsedData && parsedData.id) ? "Perubahan" : "Pembuatan"} Pengeluaran</h1>
            <form className={"mt-4"}>
                <div className="mb-1 flex flex-col gap-6">
                    <MotionConfig
                        key={"expense_form"}
                        transition={{duration: 0.5}}
                    >
                        <AnimatePresence>
                            <div>
                                <label htmlFor="location">
                                    {/*@ts-expect-error weird react 19 types error*/}
                                    <Typography variant="h6" color="blue-gray">
                                        Lokasi
                                    </Typography>
                                </label>
                                <SelectComponent<number>
                                    isDisabled={!!parsedData}
                                    setValue={(v) => setData(d => ({
                                        ...d,
                                        location_id: v,
                                    }))}
                                    options={locationDataMapped}
                                    selectedOption={
                                        locationDataMapped.find(r => r.value == data.location_id)
                                    }
                                    placeholder={"Masukan Lokasi"}
                                    isError={false}
                                />
                            </div>
                            {
                                data?.location_id &&
                                <motion.div
                                    key={"booking"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    <label htmlFor="booking">
                                        {/*@ts-expect-error weird react 19 types error*/}
                                        <Typography variant="h6" color="blue-gray">
                                            Booking (Opsional)
                                        </Typography>
                                    </label>
                                    <SelectComponent<number>
                                        setValue={(v) => setData(d => ({
                                            ...d,
                                            booking_id: v,
                                        }))}
                                        options={bookingDataMapped}
                                        selectedOption={
                                            bookingDataMapped.find(r => r.value == (data.related_id && typeof data.related_id === 'object' && 'booking_id' in data.related_id ? data.related_id.booking_id as number : undefined))
                                        }
                                        placeholder={"Pilih Booking (Opsional)"}
                                        isError={!!fieldErrors?.booking_id}
                                    />
                                    {
                                        fieldErrors?.booking_id &&
                                // @ts-expect-error weird react 19 types error
                                        <Typography color="red">{fieldErrors?.booking_id._errors}</Typography>
                                    }
                                </motion.div>
                            }
                            <motion.div
                                key={"amount"}
                                initial={{opacity: 0, height: 0}}
                                animate={{opacity: 1, height: "auto"}}
                                exit={{opacity: 0, height: 0}}
                            >
                                <label htmlFor="amount">
                                    {/*@ts-expect-error weird react 19 types error*/}
                                    <Typography variant="h6" color="blue-gray">
                                        Jumlah
                                    </Typography>
                                </label>
                                <CurrencyInput
                                    disabled={data.location_id == undefined}
                                    name={"amount"}
                                    value={Number(data.amount)}
                                    setValue={(newValue) => {
                                        setData(d => ({
                                            ...d,
                                            amount: newValue == undefined ? undefined : new Prisma.Decimal(newValue)
                                        }));
                                    }}
                                    size="lg"
                                    className={"!border-t-blue-gray-200 focus:!border-t-gray-900"}
                                    labelProps={{
                                        className: "before:content-none after:content-none",
                                    }}
                                />
                                {
                                    fieldErrors?.amount &&
                                // @ts-expect-error weird react 19 types error
                                    <Typography color="red">{fieldErrors?.amount._errors}</Typography>
                                }
                            </motion.div>
                            {
                                data?.amount &&
                                <motion.div
                                    key={"kategori"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    <label htmlFor="kategori">
                                        {/*@ts-expect-error weird react 19 types error*/}
                                        <Typography variant="h6" color="blue-gray">
                                            Kategori
                                        </Typography>
                                    </label>
                                    <SelectComponent<string>
                                        type={"creatable"}
                                        setValue={(v) => setData(prev => ({...prev, category: v}))}
                                        options={expenseCategoryMapped}
                                        selectedOption={
                                            expenseCategoryMapped.find(r => r.value == data.category)
                                        }
                                        placeholder={"Pilih Kategori atau Buat Baru"}
                                        isError={!!fieldErrors?.category}
                                    />
                                    {
                                        fieldErrors?.category &&
                                // @ts-expect-error weird react 19 types error
                                        <Typography color="red">{fieldErrors?.category._errors}</Typography>
                                    }
                                </motion.div>
                            }
                            {
                                data?.amount &&
                                <motion.div
                                    key={"description"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    <label htmlFor="description">
                                        {/*@ts-expect-error weird react 19 types error*/}
                                        <Typography variant="h6" color="blue-gray">
                                            Deskripsi
                                        </Typography>
                                    </label>
                                    {/*@ts-expect-error weird react 19 types error*/}
                                    <Input
                                        variant="outlined"
                                        name="description"
                                        value={data.description ?? ""}
                                        onChange={(e) => setData(prev => ({
                                            ...prev,
                                            description: e.target.value
                                        }))}
                                        size="lg"
                                        error={!!fieldErrors?.description}
                                        className={`${!!fieldErrors?.description ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                        labelProps={{
                                            className: "before:content-none after:content-none",
                                        }}
                                    />
                                    {
                                        fieldErrors?.description &&
                                // @ts-expect-error weird react 19 types error
                                        <Typography color="red">{fieldErrors?.description._errors}</Typography>
                                    }
                                </motion.div>
                            }
                            {
                                data?.amount &&
                                <motion.div
                                    key={"date"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    <label htmlFor="date">
                                        {/*@ts-expect-error weird react 19 types error*/}
                                        <Typography variant="h6" color="blue-gray">
                                            Tanggal
                                        </Typography>
                                    </label>
                                    <DatePicker
                                        mode="single"
                                        placeholder="Pilih tanggal transaksi"
                                        showSearchButton={false}
                                        onUpdate={(dateData) => {
                                            if (dateData.singleDate) {
                                                setData(p => ({...p, date: dateData.singleDate}));
                                            }
                                        }}
                                    />
                                    {
                                        fieldErrors?.date &&
                                // @ts-expect-error weird react 19 types error
                                        <Typography color="red">{fieldErrors?.date._errors}</Typography>
                                    }
                                </motion.div>
                            }
                            {
                                props.mutationResponse?.failure &&
                                // @ts-expect-error weird react 19 types error
                                <Typography variant="h6" color="red" className="-mb-4">
                                    {props.mutationResponse.failure}
                                </Typography>
                            }
                        </AnimatePresence>
                    </MotionConfig>
                </div>

                <div className={"flex gap-x-4 justify-end"}>
                    {/*@ts-expect-error weird react 19 types error*/}
                    <Button onClick={() => props.setDialogOpen(false)} variant={"outlined"} className="mt-6">
                        Batal
                    </Button>
                    {/*@ts-expect-error weird react 19 types error*/}
                    <Button disabled={!isFormComplete || !hasChanges(initialData, data)}
                            onClick={() => props.mutation.mutate(data)}
                            color={"blue"} className="mt-6"
                            loading={props.mutation.isPending}>
                        {(parsedData && parsedData.id) ? "Ubah" : "Buat"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

