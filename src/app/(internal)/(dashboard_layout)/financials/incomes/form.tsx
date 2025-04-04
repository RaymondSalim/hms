"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import React, {useContext, useEffect, useMemo, useState} from "react";
import {Button, Input, Popover, PopoverContent, PopoverHandler, Typography} from "@material-tailwind/react";
import {useQuery} from "@tanstack/react-query";
import {SelectComponent, SelectOption} from "@/app/_components/input/select";
import {getLocations} from "@/app/_db/location";
import {ZodFormattedError} from "zod";
import {DayPicker} from "react-day-picker";
import {formatToDateTime} from "@/app/_lib/util";
import "react-day-picker/style.css";
import {AnimatePresence, motion, MotionConfig} from "framer-motion";
import {NonUndefined} from "@/app/_lib/types";
import {Prisma, Transaction, TransactionType} from "@prisma/client";
import CurrencyInput from "@/app/_components/input/currencyInput";
import {HeaderContext} from "@/app/_context/HeaderContext";
import {getTransactions} from "@/app/_db/transaction";

interface IncomeFormProps extends TableFormProps<Transaction> {
}

type DataType = Partial<NonUndefined<IncomeFormProps['contentData']>>;

export function IncomeForm(props: IncomeFormProps) {
    let parsedData: typeof props.contentData;
    if (props.contentData) {
        parsedData = {
            ...props.contentData,
            type: TransactionType.INCOME
        };
    }

    const headerContext = useContext(HeaderContext);

    const [data, setData] = useState<DataType>(parsedData ?? {
        type: TransactionType.INCOME
    });
    const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<DataType> | undefined>(props.mutationResponse?.errors);
    const [popoverOpen, setIsPopoverOpen] = useState(false);

    const today = new Date();

    const [initialData, setInitialData] = useState<Partial<DataType>>(parsedData ?? {
        type: TransactionType.INCOME
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

    // Location Data
    const {data: incomeCategory, isSuccess: incomeCategorySuccess} = useQuery({
        queryKey: ['income.category', headerContext.locationID],
        queryFn: () => getTransactions({
            where: {
                location_id: headerContext.locationID,
                type: TransactionType.INCOME,
            },
            select: {
                category: true
            },
            distinct: ['category']
        }),
    });

    const [incomeCategoryMapped, setIncomeCategoryMapped] = useState<SelectOption<string>[]>([]);
    useEffect(() => {
        if (incomeCategorySuccess && incomeCategory) {
            setIncomeCategoryMapped(
                incomeCategory
                    .filter(e => e.category != null)
                    .map(e => ({
                        value: e.category!,
                        label: `${e.category}`,
                    }))
            );
        }
    }, [incomeCategory, incomeCategorySuccess]);


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
                        key={"income_form"}
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
                            <motion.div
                                key={"amount"}
                                initial={{opacity: 0, height: 0}}
                                animate={{opacity: 1, height: "auto"}}
                                exit={{opacity: 0, height: 0}}
                            >
                                <label htmlFor="amount">
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
                                        <Typography variant="h6" color="blue-gray">
                                            Kategori
                                        </Typography>
                                    </label>
                                    <SelectComponent<string>
                                        type={"creatable"}
                                        setValue={(v) => setData(prev => ({...prev, category: v}))}
                                        options={incomeCategoryMapped}
                                        selectedOption={
                                            incomeCategoryMapped.find(r => r.value == data.category)
                                        }
                                        placeholder={"Pilih Kategori atau Buat Baru"}
                                        isError={!!fieldErrors?.category}
                                    />
                                    {
                                        fieldErrors?.category &&
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
                                        <Typography variant="h6" color="blue-gray">
                                            Deskripsi
                                        </Typography>
                                    </label>
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
                                        <Typography variant="h6" color="blue-gray">
                                            Tanggal
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
                                                value={data.date ? formatToDateTime(data.date, false) : ""}
                                                error={!!fieldErrors?.date}
                                                className={`relative ${!!fieldErrors?.date ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                                labelProps={{
                                                    className: "before:content-none after:content-none",
                                                }}
                                            />
                                        </PopoverHandler>
                                        <PopoverContent className={"z-[99999]"}>
                                            <DayPicker
                                                timeZone={"UTC"}
                                                captionLayout="dropdown"
                                                mode="single"
                                                fixedWeeks={true}
                                                selected={data.date ? data.date : undefined}
                                                onSelect={(d) => {
                                                    setIsPopoverOpen(false);
                                                    setData(p => ({...p, date: d}));
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
                                        fieldErrors?.date &&
                                        <Typography color="red">{fieldErrors?.date._errors}</Typography>
                                    }
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
                        {(parsedData && parsedData.id) ? "Ubah" : "Buat"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

