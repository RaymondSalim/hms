"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import React, {useEffect, useMemo, useState} from "react";
import {Button, Checkbox, Typography} from "@material-tailwind/react";
import {useQuery} from "@tanstack/react-query";
import {SelectComponent, SelectOption} from "@/app/_components/input/select";
import {getLocations} from "@/app/_db/location";
import {ZodFormattedError} from "zod";
import {DatePicker} from "@/app/_components/DateRangePicker";
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
    const parsedData = useMemo(() => {
        if (!props.contentData) return undefined;
        return {
            ...props.contentData
        };
    }, [props.contentData]);

    const [data, setData] = useState<DataType>(parsedData ?? {});
    const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<DataType> | undefined>(props.mutationResponse?.errors);
    const [locationID, setLocationID] = useState<number | undefined>(parsedData?.bookings?.rooms?.location_id ?? undefined);
    const [understoodWarning, setUnderstoodWarning] = useState(false);

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
        const newData = parsedData ?? {};
        setInitialData(newData);
        setData(newData);
        setLocationID(parsedData?.bookings?.rooms?.location_id ?? undefined);
    }, [parsedData]);

    useEffect(() => {
        setFieldErrors(props.mutationResponse?.errors);
    }, [props.mutationResponse?.errors]);

    const isFormComplete = useMemo(() => {
        return !!data?.booking_id;
    }, [data]);

    const isButtonDisabled = useMemo(() => {
        const basicValidation = !isFormComplete || !hasChanges(initialData, data);
        const warningValidation = parsedData?.id ? !understoodWarning : false; // Only require checkbox when editing
        return basicValidation || warningValidation;
    }, [isFormComplete, initialData, data, understoodWarning, parsedData?.id]);

    return (
        <div className={"w-full px-8 py-4"}>
            <h1 className={"text-xl font-semibold text-black"}>{(parsedData && parsedData.id) ? "Perubahan" : "Pembuatan"} Tagihan</h1>
            <form className={"mt-4"}>
                <div className="mb-1 flex flex-col gap-6">
                    <MotionConfig
                        key={"bill_form"}
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
                                    {/*@ts-expect-error weird react 19 types error*/}
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
                                        // @ts-expect-error weird react 19 types error
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
                                    {/*@ts-expect-error weird react 19 types error*/}
                                        <Typography variant="h6" color="blue-gray">
                                            Tanggal Jatuh Tempo
                                        </Typography>
                                    </label>
                                    <DatePicker
                                        mode="single"
                                        placeholder="Pilih tanggal jatuh tempo"
                                        showSearchButton={false}
                                        initialDate={{
                                            singleDate: data.due_date
                                        }}
                                        onUpdate={(dateData) => {
                                            if (dateData.singleDate) {
                                                setData(p => ({...p, due_date: dateData.singleDate}));
                                            }
                                        }}
                                    />
                                    {
                                        fieldErrors?.due_date &&
                                        // @ts-expect-error weird react 19 types error
                                        <Typography color="red">{fieldErrors?.due_date._errors}</Typography>
                                    }
                                </motion.div>
                            }
                            {parsedData?.id && (
                                <>
                                    <motion.div
                                        key={"warning_message"}
                                        initial={{opacity: 0, height: 0}}
                                        animate={{opacity: 1, height: "auto"}}
                                        exit={{opacity: 0, height: 0}}
                                        className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg"
                                    >
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                    {/*@ts-expect-error weird react 19 types error*/}
                                                <Typography variant="h6" color="amber" className="font-medium text-amber-800">
                                                    Peringatan Alokasi Pembayaran
                                                </Typography>
                                    {/*@ts-expect-error weird react 19 types error*/}
                                                <Typography variant="small" color="amber" className="mt-1 text-amber-700">
                                                    Mengubah rincian tagihan dapat mempengaruhi alokasi pembayaran yang sudah ada.
                                                    Harap periksa kembali alokasi pembayaran setelah menyimpan perubahan ini.
                                                </Typography>
                                            </div>
                                        </div>
                                    </motion.div>
                                    <motion.div
                                        key={"warning_checkbox"}
                                        initial={{opacity: 0, height: 0}}
                                        animate={{opacity: 1, height: "auto"}}
                                        exit={{opacity: 0, height: 0}}
                                        className="mt-1"
                                    >
                                        {/* @ts-expect-error weird react 19 types error */}
                                        <Checkbox
                                            label={
                                                // @ts-expect-error weird react 19 types error
                                                <Typography color="amber" className="font-medium text-amber-800">
                                                    Saya memahami bahwa perubahan ini dapat mempengaruhi alokasi pembayaran yang sudah ada
                                                </Typography>
                                            }
                                            checked={understoodWarning}
                                            onChange={(e) => setUnderstoodWarning(e.target.checked)}
                                            containerProps={{
                                                className: "-ml-3",
                                            }}
                                        />
                                    </motion.div>
                                </>
                            )}
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
                    <Button disabled={isButtonDisabled}
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

