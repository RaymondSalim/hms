"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import React, {useEffect, useMemo, useState} from "react";
import {Button, Input, Popover, PopoverContent, PopoverHandler, Typography} from "@material-tailwind/react";
import {useQuery} from "@tanstack/react-query";
import {SelectComponent, SelectOption} from "@/app/_components/input/select/select";
import {getLocations} from "@/app/_db/location";
import {ZodFormattedError} from "zod";
import {DayPicker} from "react-day-picker";
import {formatToDateTime} from "@/app/_lib/util";
import "react-day-picker/style.css";
import {getAllBookingsAction} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import {AnimatePresence, motion, MotionConfig} from "framer-motion";
import {NonUndefined} from "@/app/_lib/types";
import {BillIncludeBookingAndPayments} from "@/app/_db/bills";

interface BillForm extends TableFormProps<BillIncludeBookingAndPayments> {
}

type DataType = Partial<NonUndefined<BillForm['contentData']>> & {
    payment_proof_file?: {
        fileName: string,
        fileType: string,
        b64File: string
    }
};

export function BillForm(props: BillForm) {
    let parsedData: typeof props.contentData;
    if (props.contentData) {
        parsedData = {
            ...props.contentData,
        };
    }

    const [data, setData] = useState<DataType>(parsedData ?? {});
    const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<DataType> | undefined>(props.mutationResponse?.errors);
    const [locationID, setLocationID] = useState<number | undefined>(parsedData?.bookings?.rooms?.location_id ?? undefined);
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
                label: `Pemesanan ${r.id} | Kamar ${r.rooms?.room_number}`,
            })));
        }
    }, [bookingData, isBookingDataSuccess]);

    // Use effect to set initialBookingData when the component mounts
    useEffect(() => {
        setInitialData(parsedData ?? {});
    }, [parsedData]);

    useEffect(() => {
        setFieldErrors(props.mutationResponse?.errors);
    }, [props.mutationResponse?.errors]);

    const isFormComplete = useMemo(() => {
        return !!data?.booking_id
    }, [data]);


    return (
        <div className={"w-full px-8 py-4"}>
            <h1 className={"text-xl font-semibold text-black"}>{parsedData ? "Perubahan" : "Pembuatan"} Tagihan</h1>
            <form className={"mt-4"}>
                <div className="mb-1 flex flex-col gap-6">
                    <MotionConfig
                        key={"bill_form"}
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
                                    setValue={(v) => setLocationID(v)}
                                    options={locationDataMapped}
                                    selectedOption={
                                        locationDataMapped.find(r => r.value == locationID)
                                    }
                                    placeholder={"Masukan Lokasi"}
                                    isError={false}
                                />
                            </div>
                            {
                                locationID &&
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
                                        isDisabled={!!parsedData}
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
                                    key={"due_date"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    <label htmlFor="due_date">
                                        <Typography variant="h6" color="blue-gray">
                                            Tanggal Jatuh Tempo
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
                                                value={data.due_date ? formatToDateTime(data.due_date, false) : ""}
                                                error={!!fieldErrors?.due_date}
                                                className={`relative ${!!fieldErrors?.due_date ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
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
                                                selected={data.due_date ? data.due_date : new Date()}
                                                onSelect={(d) => {
                                                    setIsPopoverOpen(false);
                                                    setData(p => ({...p, due_date: d}));
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
                                        fieldErrors?.due_date &&
                                        <Typography color="red">{fieldErrors?.due_date._errors}</Typography>
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
                        {parsedData ? "Ubah" : "Buat"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

