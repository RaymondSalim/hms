"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import React, {useEffect, useMemo, useState} from "react";
import {Button, Checkbox, Input, Typography} from "@material-tailwind/react";
import {useQuery} from "@tanstack/react-query";
import {getRooms, getRoomTypes} from "@/app/_db/room";
import {SelectComponent, SelectOption} from "@/app/_components/input/select";
import {getLocations} from "@/app/_db/location";
import {getSortedDurations} from "@/app/_db/duration";
import {Prisma} from "@prisma/client";
import {ZodFormattedError} from "zod";
import {BookingsIncludeAll, getBookingStatuses} from "@/app/_db/bookings";
import {getTenants} from "@/app/_db/tenant";
import {DatePicker} from "@/app/_components/DateRangePicker";
import {getLastDateOfBooking} from "@/app/_lib/util";
import {getAllBookingsAction, UpsertBookingPayload,} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import {AnimatePresence, motion, MotionConfig} from "framer-motion";
import CurrencyInput from "@/app/_components/input/currencyInput";
import {getAddonsByLocation} from "@/app/(internal)/(dashboard_layout)/addons/addons-action";

interface BookingFormProps extends TableFormProps<BookingsIncludeAll> {
}

export function BookingForm(props: BookingFormProps) {
    const today = new Date();

    const [bookingData, setBookingData] = useState<Partial<UpsertBookingPayload>>(props.contentData ?? {});
    const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<UpsertBookingPayload> | undefined>(props.mutationResponse?.errors);
    const [locationID, setLocationID] = useState<number | undefined>(props.contentData?.rooms?.location_id ?? undefined);
    const [understoodWarning, setUnderstoodWarning] = useState(false);

    const [popoverOpenMap, setPopoverOpenMap] = useState<Record<string, boolean>>({});

    const togglePopover = (index: string) => {
        setPopoverOpenMap((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };

    const [hasAddons, setHasAddons] = useState(false);

    const [initialBookingData, setInitialBookingData] = useState<Partial<BookingsIncludeAll>>(props.contentData ?? {});
    // Function to compare initial and current booking data
    const hasChanges = (initialData: Partial<BookingsIncludeAll>, currentData: Partial<BookingsIncludeAll>) => {
        return JSON.stringify(initialData) !== JSON.stringify(currentData);
    };

    const isButtonDisabled = useMemo(() => {
        const basicValidation = !bookingData.tenant_id ||
            !bookingData.room_id ||
            !bookingData.start_date ||
            !(bookingData.duration_id || bookingData.is_rolling) ||
            !bookingData.fee ||
            !bookingData.status_id;
        const warningValidation = props.contentData?.id ? !understoodWarning : false; // Only require checkbox when editing
        return basicValidation || warningValidation;
    }, [bookingData, understoodWarning, props.contentData?.id]);

    // Use effect to set initialBookingData when the component mounts
    useEffect(() => {
        setInitialBookingData(props.contentData ?? {});
        if (props.contentData?.addOns && props.contentData.addOns.length > 0) {
            setHasAddons(true);
        }
    }, [props.contentData]);

    useEffect(() => {
        setFieldErrors(props.mutationResponse?.errors);
    }, [props.mutationResponse?.errors]);

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

    // Room Data
    const {data: roomData, isSuccess: roomDataSuccess} = useQuery({
        queryKey: ['rooms', locationID],
        queryFn: () => getRooms(undefined, locationID),
        enabled: locationID != undefined,
    });
    const [roomDataMapped, setRoomDataMapped] = useState<SelectOption<number>[]>([]);
    useEffect(() => {
        if (roomDataSuccess) {
            setRoomDataMapped(roomData.map(r => ({
                value: r.id,
                label: `Kamar ${r.room_number} | ${r.roomtypes?.type}`,
                type_id: r.roomtypes?.id
            })));
        }
    }, [roomData, roomDataSuccess, initialBookingData]);

    // Room Type Data (only if fromQuery)
    const {data: roomTypeData, isSuccess: roomTypeDataSuccess} = useQuery({
        queryKey: ['rooms.type', 'location_id', locationID],
        queryFn: () => getRoomTypes(locationID),
        enabled: props.fromQuery
    });

    const {data: durationsData, isSuccess: durationsDataSuccess, isLoading} = useQuery({
        queryKey: ['rooms.durations'],
        queryFn: () => getSortedDurations(),
    });
    const [durationDataMapped, setDurationDataMapped] = useState<SelectOption<number>[]>([]);
    useEffect(() => {
        if (durationsDataSuccess) {
            const rollingOption: SelectOption<number> = {
                value: -1, // Using -1 to signify a rolling booking
                label: "Sewa Bulanan (Rolling)"
            };
            const mappedDurations = durationsData.map(d => ({
                value: d.id,
                label: `${d.duration}`
            }));
            setDurationDataMapped([rollingOption, ...mappedDurations]);
        }
    }, [durationsData, durationsDataSuccess]);

    // Status Data
    const {data: statusData, isSuccess: statusDataSuccess} = useQuery({
        queryKey: ['bookings.status'],
        queryFn: () => getBookingStatuses(),
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

    // Tenant Data
    const {data: tenantData, isSuccess: tenantDataSuccess} = useQuery({
        queryKey: ['tenants'],
        queryFn: () => getTenants(),
    });
    const [tenantDataMapped, setTenantDataMapped] = useState<SelectOption<string>[]>([]);
    useEffect(() => {
        if (tenantDataSuccess) {
            setTenantDataMapped(tenantData.map(e => ({
                value: e.id,
                label: `${e.name} | ${e.phone}`,
            })));
        }
    }, [tenantData, tenantDataSuccess]);

    // Addons Data
    const {data: addonData, isSuccess: addonDataSuccess} = useQuery({
        queryKey: ['addons', 'location_id', locationID],
        queryFn: () => getAddonsByLocation(locationID),
        enabled: hasAddons,
    });
    const [addonDataMapped, setAddonDataMapped] = useState<SelectOption<string>[]>([]);
    useEffect(() => {
        if (addonDataSuccess) {
            setAddonDataMapped(addonData.map(a => ({
                value: a.id,
                label: `${a.name} | ${a.description}`,
            })));
        }
    }, [addonData, addonDataSuccess]);

    // Suggested Pricing
    useEffect(() => {
        if (initialBookingData.fee) return;
        if (bookingData.room_id && bookingData.duration_id) {
            const targetRt = roomData?.find(r =>
                r.id == bookingData.room_id
            )?.roomtypes;

            const targetRtd = targetRt?.roomtypedurations?.find(rtd => rtd.duration_id == bookingData.duration_id);

            if (targetRtd) {
                if (typeof targetRtd.suggested_price == "string") {
                    targetRtd.suggested_price = new Prisma.Decimal(targetRtd.suggested_price);
                }
                setBookingData(p => ({
                    ...p,
                    fee: targetRtd.suggested_price ?? undefined
                }));
            }
        }
    }, [roomData, bookingData.room_id, bookingData.duration_id]);

    // Check for existing bookings
    const {
        data: existingBookings,
        isLoading: isExistingBookingLoading,
        isSuccess: isExistingBookingSuccess
    } = useQuery({
        queryKey: ['bookings', 'room_id', bookingData.room_id],
        queryFn: () => getAllBookingsAction(undefined, bookingData.room_id ?? undefined),
        enabled: bookingData.room_id != undefined,
    });
    // Helper function to check if a booking period overlaps with existing bookings
    const checkBookingOverlap = (startDate: Date, endDate?: Date): boolean => {
        if (!existingBookings) return false;

        return existingBookings.some(existingBooking => {
            // Skip current booking if editing
            if (existingBooking.id === props.contentData?.id) return false;

            // For rolling bookings, check if they would overlap
            if (existingBooking.is_rolling) {
                // If existing booking is rolling, any new booking that starts before its end date (if any) would overlap
                if (existingBooking.end_date) {
                    // Normalize dates to remove time components for accurate comparison
                    const normalizedStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                    const normalizedExistingEndDate = new Date(existingBooking.end_date.getFullYear(), existingBooking.end_date.getMonth(), existingBooking.end_date.getDate());
                    return normalizedStartDate <= normalizedExistingEndDate;
                } else {
                    // If existing rolling booking has no end date, any new booking would overlap
                    return true;
                }
            }

            // For fixed duration bookings, check if periods overlap
            if (existingBooking.durations) {
                const existingEndDate = getLastDateOfBooking(existingBooking.start_date, existingBooking.durations);
                // Check if the new booking period overlaps with the existing booking period
                // Two periods overlap if: new start <= existing end AND new end >= existing start

                // Normalize dates to remove time components for accurate comparison
                const normalizedStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                const normalizedExistingStartDate = new Date(existingBooking.start_date.getFullYear(), existingBooking.start_date.getMonth(), existingBooking.start_date.getDate());
                const normalizedExistingEndDate = new Date(existingEndDate.getFullYear(), existingEndDate.getMonth(), existingEndDate.getDate());

                if (endDate) {
                    const normalizedEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                    return normalizedStartDate <= normalizedExistingEndDate && normalizedEndDate >= normalizedExistingStartDate;
                } else {
                    return normalizedStartDate <= normalizedExistingEndDate;
                }
            }

            // Handle rolling bookings that have been converted to fixed end date (is_rolling = false, end_date set, duration_id = null)
            if (existingBooking.end_date && !existingBooking.durations) {
                // Normalize dates to remove time components for accurate comparison
                const normalizedStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                const normalizedExistingStartDate = new Date(existingBooking.start_date.getFullYear(), existingBooking.start_date.getMonth(), existingBooking.start_date.getDate());
                const normalizedExistingEndDate = new Date(existingBooking.end_date.getFullYear(), existingBooking.end_date.getMonth(), existingBooking.end_date.getDate());

                if (endDate) {
                    const normalizedEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                    return normalizedStartDate <= normalizedExistingEndDate && normalizedEndDate >= normalizedExistingStartDate;
                } else {
                    return normalizedStartDate <= normalizedExistingEndDate;
                }
            }

            return false;
        });
    };

    // Disable duration options when start date is selected
    useEffect(() => {
        if (bookingData.start_date) {
            const newDurationData = structuredClone(durationDataMapped);
            let hasChange = false;

            // Check if there's already a rolling booking for this room
            const hasExistingRollingBooking = existingBookings?.some(booking =>
                booking.is_rolling &&
                booking.id !== props.contentData?.id // Exclude current booking if editing
            ) ?? false;

            // Disable rolling option if there's already a rolling booking or if it would overlap with existing bookings
            if (newDurationData[0]) { // Rolling option is at index 0
                const wouldOverlap = checkBookingOverlap(bookingData.start_date!);
                const shouldDisableRolling = hasExistingRollingBooking || wouldOverlap;
                hasChange = hasChange || newDurationData[0].isDisabled != shouldDisableRolling;
                newDurationData[0].isDisabled = shouldDisableRolling;
            }

            // Check fixed duration bookings
            durationsData?.forEach((val, index) => {
                // Adjust index because durationDataMapped has rolling option at index 0
                const mappedIndex = index + 1;
                if (newDurationData[mappedIndex]) {
                    let lastDate = getLastDateOfBooking(bookingData.start_date!, val);
                    const wouldOverlap = checkBookingOverlap(bookingData.start_date!, lastDate);

                    hasChange = hasChange || newDurationData[mappedIndex].isDisabled != wouldOverlap;
                    newDurationData[mappedIndex].isDisabled = wouldOverlap;
                }
            });

            if (hasChange) {
                setDurationDataMapped([...newDurationData]);
            }
        }
    }, [bookingData.start_date, durationDataMapped, durationsData, existingBookings, props.contentData?.id]);

    // Helper Functions for Addons Management
    const addAddonEntry = () => {
        // @ts-expect-error missing required members of addOns
        setBookingData((prev) => ({
            ...prev,
            addOns: [
                ...(prev.addOns || []),
                {id: undefined, booking_id: prev.id},
            ],
        }));
    };

    // @ts-expect-error error type definition of key
    const updateAddonEntry = (index: number, key: keyof typeof bookingData.addOns[0], value: any) => {
        setBookingData((prev) => ({
            ...prev,
            addOns: prev.addOns?.map((addon, i) =>
                i === index ? {...addon, [key]: value} : addon
            ),
        }));
    };

    const removeAddonEntry = (index: number) => {
        setBookingData((prev) => ({
            ...prev,
            addOns: prev.addOns?.filter((_, i) => i !== index),
        }));
    };

    return (
        <div className={"w-full px-8 py-4"}>
            <h1 className={"text-xl font-semibold text-black"}>{(props.contentData && props.contentData.id) && !props.fromQuery ? "Perubahan" : "Pembuatan"} Booking</h1>
            <form className={"mt-4"}>
                <div className="mb-1 flex flex-col gap-6">
                    <MotionConfig
                        transition={{duration: 0.5}}
                    >
                        <AnimatePresence key={"booking_form"}>
                            <div>
                                <label htmlFor="tenant_id">
                                    <Typography variant="h6" color="blue-gray">
                                        Penyewa
                                    </Typography>
                                </label>
                                <SelectComponent<string>
                                    setValue={(v) => setBookingData(prev => ({...prev, tenant_id: v}))}
                                    options={tenantDataMapped}
                                    selectedOption={
                                        tenantDataMapped.find(r => r.value == bookingData.tenant_id)
                                    }
                                    placeholder={"Pick Tenant"}
                                    isError={!!fieldErrors?.tenant_id}
                                />
                                {
                                    fieldErrors?.tenant_id &&
                                    <Typography color="red">{fieldErrors?.tenant_id._errors}</Typography>
                                }
                            </div>
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
                            {
                                props.fromQuery &&
                                <div>
                                    <label htmlFor="room_type_id">
                                        <Typography variant="h6" color="blue-gray">
                                            Tipe Kamar
                                        </Typography>
                                    </label>
                                    <Input
                                        disabled={true}
                                        value={(() => {
                                            return roomTypeData?.find(rt => rt.id == bookingData.rooms?.room_type_id)?.type;
                                        })()}
                                    />
                                </div>
                            }
                            <div>
                                <label htmlFor="room_id">
                                    <Typography variant="h6" color="blue-gray">
                                        Kamar
                                    </Typography>
                                </label>
                                <SelectComponent<number>
                                    setValue={(v) => setBookingData(p => ({
                                        ...p,
                                        room_id: v
                                    }))}
                                    options={roomDataMapped}
                                    selectedOption={
                                        roomDataMapped.find(r => r.value == bookingData.room_id)
                                    }
                                    placeholder={"Pilih Kamar"}
                                    isError={!!fieldErrors?.room_id}
                                    isDisabled={locationID == undefined}
                                />
                                {
                                    fieldErrors?.room_id &&
                                    <Typography color="red">{fieldErrors?.room_id._errors}</Typography>
                                }
                            </div>
                            {
                                isExistingBookingSuccess &&
                                <motion.div
                                    key={"start_date"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    <label htmlFor="start_date">
                                        <Typography variant="h6" color="blue-gray">
                                            Tanggal Mulai
                                        </Typography>
                                    </label>
                                    <DatePicker
                                        className="w-full !ml-0"
                                        mode="single"
                                        placeholder="Pilih tanggal mulai"
                                        showSearchButton={false}
                                        onUpdate={(dateData) => {
                                            if (dateData.singleDate) {
                                                setBookingData(p => ({...p, start_date: dateData.singleDate, duration_id: undefined,}));
                                            }
                                        }}
                                    />
                                    {
                                        fieldErrors?.start_date &&
                                        <Typography color="red">{fieldErrors?.start_date._errors}</Typography>
                                    }
                                </motion.div>
                            }
                            {
                                bookingData.start_date &&
                                <motion.div
                                    key={"duration_id"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    <label htmlFor="duration_id">
                                        <Typography variant="h6" color="blue-gray">
                                            Durasi
                                        </Typography>
                                    </label>
                                    <SelectComponent<number>
                                        setValue={(v) => {
                                            if (v === -1) {
                                                setBookingData(p => ({
                                                    ...p,
                                                    duration_id: null,
                                                    is_rolling: true
                                                }));
                                            } else {
                                                setBookingData(p => ({
                                                    ...p,
                                                    duration_id: v,
                                                    is_rolling: false
                                                }));
                                            }
                                        }}
                                        options={durationDataMapped}
                                        selectedOption={
                                            bookingData.is_rolling ? durationDataMapped[0] :
                                            (bookingData.duration_id !== undefined && bookingData.duration_id !== null)
                                                ? durationDataMapped.find(r => r.value === bookingData.duration_id)
                                                : undefined
                                        }
                                        placeholder={"Pick duration"}
                                        isError={!!fieldErrors?.duration_id}
                                    />
                                    {
                                        fieldErrors?.duration_id &&
                                        <Typography color="red">{fieldErrors?.duration_id._errors}</Typography>
                                    }
                                </motion.div>
                            }
                            {
                                (bookingData.duration_id || bookingData.is_rolling) &&
                                <motion.div
                                    key={"price"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    <label htmlFor="fee">
                                        <Typography variant="h6" color="blue-gray">
                                            Harga
                                        </Typography>
                                    </label>
                                    <CurrencyInput
                                        name={"fee"}
                                        disabled={bookingData.room_id == undefined}
                                        value={Number(bookingData.fee) || ""}
                                        setValue={(newValue) => {
                                            setBookingData(old => ({
                                                ...old,
                                                fee: newValue == undefined ? undefined : new Prisma.Decimal(newValue)
                                            }));
                                        }}
                                        size="lg"
                                        error={!!fieldErrors?.fee}
                                        className={`${!!fieldErrors?.fee ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                        labelProps={{
                                            className: "before:content-none after:content-none",
                                        }}
                                    />
                                    {
                                        fieldErrors?.fee &&
                                        <Typography color="red">{fieldErrors?.fee._errors}</Typography>
                                    }
                                </motion.div>
                            }
                            {
                                (bookingData.duration_id || bookingData.is_rolling) &&
                                <motion.div
                                    key={"status"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    <label htmlFor="status_id">
                                        <Typography variant="h6" color="blue-gray">
                                            Status
                                        </Typography>
                                    </label>
                                    <SelectComponent<number>
                                        setValue={(v) => setBookingData(prevState => ({...prevState, status_id: v}))}
                                        options={statusDataMapped}
                                        selectedOption={statusDataMapped.find(r => r.value == bookingData.status_id)}
                                        placeholder={"Pilih Status"}
                                        isError={!!fieldErrors?.status_id}
                                    />
                                    {
                                        fieldErrors?.status_id &&
                                        <Typography color="red">{fieldErrors?.status_id._errors}</Typography>
                                    }
                                </motion.div>
                            }
                            {
                                (bookingData.duration_id || bookingData.is_rolling) &&
                                <motion.div
                                    key={"deposit"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    <Checkbox
                                        label={
                                            <Typography color="blue-gray" className="font-medium">
                                                Deposit diperlukan
                                            </Typography>
                                        }
                                        checked={bookingData.deposit != undefined}
                                        onChange={(e) => {
                                            // @ts-expect-error invalid deposit type
                                            setBookingData(b => ({
                                                ...b,
                                                deposit: e.target.checked ? {} : undefined
                                            }));
                                        }}
                                        containerProps={{
                                            className: "-ml-3",
                                        }}
                                    />
                                    {bookingData.deposit != undefined && (
                                        <motion.div
                                            initial={{opacity: 0, height: 0}}
                                            animate={{opacity: 1, height: "auto"}}
                                            exit={{opacity: 0, height: 0}}
                                            className="mt-4 space-y-6"
                                        >
                                            <label htmlFor="fee">
                                                <Typography variant="h6" color="blue-gray">
                                                    Deposit
                                                </Typography>
                                            </label>
                                            <CurrencyInput
                                                name={"deposit"}
                                                value={Number(bookingData.deposit.amount) || ""}
                                                setValue={(newValue) => {
                                                    if (newValue) {
                                                        // @ts-expect-error invalid deposit type
                                                        setBookingData(old => ({
                                                            ...old,
                                                            deposit: {
                                                                ...old.deposit,
                                                                amount: new Prisma.Decimal(newValue)
                                                            }
                                                        }));
                                                    } else {
                                                        setBookingData(old => ({
                                                            ...old,
                                                            deposit: undefined,
                                                        }));
                                                    }

                                                }}
                                                size="lg"
                                                error={!!fieldErrors?.deposit}
                                                className={`${!!fieldErrors?.deposit ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                                labelProps={{
                                                    className: "before:content-none after:content-none",
                                                }}
                                            />
                                            {
                                                fieldErrors?.deposit &&
                                                <Typography color="red">{fieldErrors?.deposit._errors}</Typography>
                                            }
                                        </motion.div>
                                    )}
                                </motion.div>
                            }
                            {
                                (bookingData.duration_id || bookingData.is_rolling) &&
                                <motion.div
                                    key={"second_resident"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    <Checkbox
                                        label={
                                            <Typography color="blue-gray" className="font-medium">
                                                Ada Penghuni Kedua
                                            </Typography>
                                        }
                                        checked={bookingData.second_resident_fee != undefined}
                                        onChange={(e) => {
                                            setBookingData(b => ({
                                                ...b,
                                                second_resident_fee: e.target.checked ? new Prisma.Decimal(0) : undefined
                                            }));
                                        }}
                                        containerProps={{
                                            className: "-ml-3",
                                        }}
                                    />
                                    {bookingData.second_resident_fee != undefined && (
                                        <motion.div
                                            initial={{opacity: 0, height: 0}}
                                            animate={{opacity: 1, height: "auto"}}
                                            exit={{opacity: 0, height: 0}}
                                            className="mt-4 space-y-6"
                                        >
                                            <label htmlFor="fee">
                                                <Typography variant="h6" color="blue-gray">
                                                    Biaya Tambahan per Bulan
                                                </Typography>
                                            </label>
                                            <CurrencyInput
                                                name={"second_resident_fee"}
                                                value={Number(bookingData.second_resident_fee) || ""}
                                                setValue={(newValue) => {
                                                    setBookingData(old => ({
                                                        ...old,
                                                        second_resident_fee: newValue == undefined ? undefined : new Prisma.Decimal(newValue)
                                                    }));
                                                }}
                                                size="lg"
                                                error={!!fieldErrors?.second_resident_fee}
                                                className={`${!!fieldErrors?.second_resident_fee ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                                labelProps={{
                                                    className: "before:content-none after:content-none",
                                                }}
                                            />
                                            {
                                                fieldErrors?.second_resident_fee &&
                                                <Typography color="red">{fieldErrors?.second_resident_fee._errors}</Typography>
                                            }
                                        </motion.div>
                                    )}
                                </motion.div>
                            }
                            {
                                (bookingData.duration_id || bookingData.is_rolling) &&
                                <motion.div
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    <Checkbox
                                        label={
                                            <Typography color="blue-gray" className="font-medium">
                                                Ada tambahan layanan
                                            </Typography>
                                        }
                                        checked={hasAddons}
                                        onChange={(e) => setHasAddons(e.target.checked)}
                                        containerProps={{
                                            className: "-ml-3",
                                        }}
                                    />
                                    {hasAddons && (
                                        <motion.div
                                            initial={{opacity: 0, height: 0}}
                                            animate={{opacity: 1, height: "auto"}}
                                            exit={{opacity: 0, height: 0}}
                                            className="mt-4 space-y-6"
                                        >
                                            <label htmlFor="addons">
                                                <Typography variant="h6" color="blue-gray">
                                                    Layanan Tambahan
                                                </Typography>
                                            </label>

                                            {/* Addon Management */}
                                            {bookingData.addOns?.map((addon, index) => (
                                                <motion.div
                                                    initial={{opacity: 0, height: 0}}
                                                    animate={{opacity: 1, height: "auto"}}
                                                    exit={{opacity: 0, height: 0}}
                                                    key={index}
                                                    className="flex flex-col gap-4 border p-4 rounded-lg shadow-sm"
                                                >
                                                    {/* Addon Selection */}
                                                    <SelectComponent<string>
                                                        setValue={(value) =>
                                                            setBookingData((prev) => {
                                                                const updatedAddons = [...prev.addOns!];
                                                                updatedAddons[index] = {
                                                                    ...updatedAddons[index],
                                                                    // @ts-expect-error undefined value
                                                                    addon_id: value
                                                                };
                                                                return {...prev, addOns: updatedAddons};
                                                            })
                                                        }
                                                        options={addonDataMapped}
                                                        selectedOption={
                                                            addonDataMapped.find(
                                                                (addonOption) => addonOption.value === addon.addon_id
                                                            )}
                                                        placeholder="Pilih Layanan Tambahan"
                                                        isError={!!fieldErrors?.addOns?.[index]?.addon_id}
                                                    />
                                                    {fieldErrors?.addOns?.[index]?.addon_id && (
                                                        <Typography color="red">
                                                            {fieldErrors.addOns[index].addon_id?._errors}
                                                        </Typography>
                                                    )}

                                                    {/* Start Date */}
                                                    <div>
                                                        <Typography variant="h6" color="blue-gray">
                                                            Tanggal Mulai
                                                        </Typography>
                                                        <DatePicker
                                                            key={`${index}_dp`}
                                                            mode="single"
                                                            placeholder="Pilih tanggal mulai"
                                                            showSearchButton={false}
                                                            onUpdate={(dateData) => {
                                                                if (dateData.singleDate) {
                                                                    updateAddonEntry(index, "start_date", dateData.singleDate);
                                                                }
                                                            }}
                                                        />
                                                        {fieldErrors?.addOns?.[index]?.start_date && (
                                                            <Typography color="red">
                                                                {fieldErrors.addOns[index].start_date?._errors}
                                                            </Typography>
                                                        )}
                                                    </div>

                                                    {/* End Date */}
                                                    <div>
                                                        <Typography variant="h6" color="blue-gray">
                                                            Tanggal Selesai
                                                        </Typography>
                                                        <DatePicker
                                                            key={`${index}_dp_ed`}
                                                            mode="single"
                                                            placeholder="Pilih tanggal selesai"
                                                            showSearchButton={false}
                                                            onUpdate={(dateData) => {
                                                                if (dateData.singleDate) {
                                                                    updateAddonEntry(index, "end_date", dateData.singleDate);
                                                                }
                                                            }}
                                                        />
                                                        {fieldErrors?.addOns?.[index]?.end_date && (
                                                            <Typography color="red">
                                                                {fieldErrors.addOns[index].end_date?._errors}
                                                            </Typography>
                                                        )}
                                                    </div>

                                                    {/* Additional Input */}
                                                    <div>
                                                        <Typography variant="h6" color="blue-gray">
                                                            Deskripsi Tambahan
                                                        </Typography>
                                                        <Input
                                                            value={addon.input || ""}
                                                            onChange={(e) =>
                                                                updateAddonEntry(index, "input", e.target.value)
                                                            }
                                                            size="lg"
                                                            placeholder="Deskripsi untuk layanan tambahan ini"
                                                            error={!!fieldErrors?.addOns?.[index]?.input}
                                                            className={`${!!fieldErrors?.addOns?.[index]?.input ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                                            labelProps={{
                                                                className: "before:content-none after:content-none",
                                                            }}
                                                        />
                                                        {fieldErrors?.addOns?.[index]?.input && (
                                                            <Typography color="red">
                                                                {fieldErrors.addOns[index].input?._errors}
                                                            </Typography>
                                                        )}
                                                    </div>

                                                    {/* Remove Addon */}
                                                    <Button
                                                        color="red"
                                                        size="sm"
                                                        onClick={() => removeAddonEntry(index)}
                                                    >
                                                        Hapus
                                                    </Button>
                                                </motion.div>
                                            ))}

                                            <Button
                                                color="green"
                                                onClick={addAddonEntry}
                                                className="mt-4 w-full flex gap-x-3 items-center justify-center"
                                            >
                                                <span className={"leading-loose"}>
                                                     Tambah Layanan Tambahan
                                                </span>
                                            </Button>
                                        </motion.div>
                                    )}
                                </motion.div>
                            }
                            {props.contentData?.id && (
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
                                                <Typography variant="h6" color="amber" className="font-medium text-amber-800">
                                                    Peringatan Alokasi Pembayaran
                                                </Typography>
                                                <Typography variant="small" color="amber" className="mt-1 text-amber-700">
                                                    Mengubah rincian pemesanan dapat mempengaruhi alokasi pembayaran yang sudah ada.
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
                                        <Checkbox
                                            label={
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
                    <Button disabled={isButtonDisabled || !hasChanges(initialBookingData, bookingData)}
                            onClick={() => props.mutation.mutate(bookingData)}
                            color={"blue"} className="mt-6"
                            loading={props.mutation.isPending}>
                        {(props.contentData && props.contentData.id) && !props.fromQuery ? "Ubah" : "Buat"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

