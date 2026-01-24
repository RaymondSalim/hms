"use client";

import React, {useEffect, useState} from "react";
import {useHeader} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {useMutation, useQuery} from "@tanstack/react-query";
import {useRouter, useSearchParams} from "next/navigation";
import {toast} from "react-toastify";
import {MotionConfig} from "framer-motion";
import {Button, Checkbox, Input, Textarea, Typography} from "@material-tailwind/react";
import {SelectComponent, SelectOption} from "@/app/_components/input/select";
import {Event, Prisma} from "@prisma/client";
import type {z} from "zod";
import {ZodFormattedError} from "zod";
import {GenericActionsType} from "@/app/_lib/actions";
import {upsertEventAction} from "@/app/(internal)/(dashboard_layout)/schedule/create/event-action";
import {getEventByID} from "@/app/_db/event";
import {DatePicker} from "@/app/_components/DateRangePicker";
import {eventSchema} from "@/app/_lib/zod/event/zod";

import {FaRegClock} from "react-icons/fa6";
import {AiOutlineLoading} from "react-icons/ai";
import "./styles/create.css";
import {TZDate} from "@date-fns/tz";
import {getHHMM, getYYYYMMDD} from "@/app/_lib/util";

type EventPageQueryParam = {
    eventID?: number
}

const eventColors: Map<string, string> = new Map([
    ["Flamingo", "#e67c73"],
    ["Tangerine", "#f4511e"],
    ["Banana", "#f6bf26"],
    ["Sage", "#33b679"],
    ["Basil", "#0b8043"],
    ["Blueberry", "#3f51b5"],
    ["Lavender", "#7986cb"],
    ["Grape", "#8e24aa"],
    ["Graphite", "#616161"],
    ["Tomato", "#d50000"]
]);

// IMPORTANT: Fullcalendar is set to use 'local' timezone. Therefore, any date/time picker set here should also be set to local

// TODO! Add Event Type
interface RecurrenceData {
    daysOfWeek?: number[];
    startRecur?: string;
    endRecur?: string;
    groupId?: string;
    duration?: string;
}

interface ExtendedProps {
    recurrence?: RecurrenceData;
}

type EventData = z.infer<typeof eventSchema>;

const defaultEventData: EventData = {
    title: "",
    description: "",
    start: new TZDate(new Date(), "UTC"),
    end: undefined,
    allDay: false,
    backgroundColor: eventColors.get("Blueberry"),
    borderColor: undefined,
    textColor: undefined,
    recurring: false,
    extendedProps: {
        recurrence: {
            daysOfWeek: [],
            startRecur: undefined,
            endRecur: undefined,
            groupId: undefined,
            duration: undefined
        }
    }
};

export default function CreateEventPage() {
    const headerContext = useHeader();
    const router = useRouter();

    const searchParams = useSearchParams();
    const eventID = searchParams.get("event_id");
    const isEdit = !!eventID && Number(eventID) > 0;

    const [eventData, setEventData] = useState<EventData>(defaultEventData);
    const [initializedEventID, setInitializedEventID] = useState<number | null>(null);

    const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<Event> | undefined>();
    const [mutationResponse, setMutationResponse] = useState<GenericActionsType<Event>>();

    useEffect(() => {
        headerContext.setTitle(`${isEdit ? "Ubah" : "Buat"} Jadwal`);
        headerContext.setShowLocationPicker(true);
        headerContext.setPaths([
            <Link key={"schedule"} href={"/schedule/calendar"}>Jadwal</Link>,
            <Link key={"create"} href={"/schedule/create"}>{`${isEdit ? "Ubah" : "Buat"} Jadwal`}</Link>,
        ]);
    }, [isEdit]);

    // This block of code is for editing existing eventData
    let {
        data,
        isLoading,
        status
    } = useQuery({
        queryKey: ['eventData', eventID],
        queryFn: () => getEventByID(Number(eventID)),
        enabled: isEdit,
    });
    useEffect(() => {
        if (!isEdit) {
            setEventData(defaultEventData);
            setInitializedEventID(null);
            return;
        }
        const numericEventID = Number(eventID);
        if (status == "success" && numericEventID > 0 && initializedEventID !== numericEventID) {
            // @ts-expect-error type error
            setEventData(data);
            setInitializedEventID(numericEventID);
        } else if (status == "error") {
            toast.error("Gagal menarik data!");
        }
    }, [data, eventID, initializedEventID, isEdit, status]);

    const eventMutation = useMutation({
        mutationFn: upsertEventAction,
        onSuccess: (data, variables, context) => {
            setMutationResponse(data);
            setFieldErrors(data?.errors);

            if (data.success) {
                toast.success("Jadwal Berhasil Dibuat! Mengalihkan...", {
                    onClose: () => {
                        router.push("/schedule/calendar");
                    }
                });
            }

        }
    });

    const handleTimeChange = (field: keyof Pick<Event, "start" | "end">, value: string) => {
        const [hours, minutes] = value.split(":").map(Number);
        let localDate = new Date();
        localDate.setHours(hours);
        localDate.setMinutes(minutes);

        setEventData((prev) => {
            if (!prev[field]) return prev;

            let currentDate: TZDate;
            if (typeof prev[field] === "string") {
                currentDate = new TZDate(String(prev[field]), "UTC");
            } else if (prev[field] instanceof Date) {
                currentDate = new TZDate(prev[field]!, "UTC");
            }
            currentDate!.setUTCHours(localDate.getUTCHours(), localDate.getUTCMinutes(), 0, 0);

            return {
                ...prev,
                [field]: currentDate!,
            };
        });
    };

    const toTimeInputValue = (value?: Date | string | null) => {
        if (!value) return "";
        const date = typeof value === "string" ? new TZDate(value, "UTC") : value;
        if (Number.isNaN(date.getTime())) return "";
        const localDate = new Date(date.getTime());
        const hours = String(localDate.getHours()).padStart(2, "0");
        const minutes = String(localDate.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    };

    const selectOptions: SelectOption<string>[] = [];
    eventColors.forEach((v, k) => {
        selectOptions.push({
            label: k,
            value: v
        });
    });

    const dot = (color = 'transparent') => ({
        alignItems: 'center',
        display: 'flex',

        ':before': {
            backgroundColor: color,
            borderRadius: 10,
            content: '" "',
            display: 'block',
            marginRight: 8,
            height: 10,
            width: 10,
        },
    });

    return (
        <div className={"mx-auto w-full md:w-4/5 md:min-w-[540px] md:px-8 py-4"}>
            {isEdit && isLoading ? (
                <div className="flex justify-center py-8">
                    <span className={"h-32 w-32"}>
                        <AiOutlineLoading className="animate-spin text-black"/>
                    </span>
                </div>
            ) : (
                    <form className={"mt-4"}>
                        <div className="mb-1 flex flex-col gap-6">
                            <MotionConfig
                                key={"event_form"}
                                transition={{duration: 0.5}}
                            >
                                <div>
                                    <label htmlFor="title">
                                        {/* @ts-expect-error weird react 19 types error */}
                                        <Typography variant="h6" color="blue-gray">
                                            Judul
                                        </Typography>
                                    </label>
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Input
                                        variant="outlined"
                                        name="title"
                                        value={eventData.title}
                                        onChange={(e) => setEventData(prevEvent => ({
                                            ...prevEvent,
                                            title: e.target.value
                                        }))}
                                        size="lg"
                                        error={!!fieldErrors?.title}
                                        className={`${!!fieldErrors?.title ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                        labelProps={{
                                            className: "before:content-none after:content-none",
                                        }}
                                    />
                                    {
                                        fieldErrors?.title &&
                                        // @ts-expect-error weird react 19 types error
                                        <Typography color="red">{fieldErrors?.title._errors}</Typography>
                                    }
                                </div>
                                <div>
                                    <label htmlFor="start_date">
                                        {/* @ts-expect-error weird react 19 types error */}
                                        <Typography variant="h6" color="blue-gray">
                                            Tanggal Mulai
                                        </Typography>
                                    </label>
                                    <div className={"flex flex-col flex-wrap gap-y-2"}>
                                        <DatePicker
                                            mode="single"
                                            initialDate={(() => {
                                                return {singleDate: new TZDate(eventData.start, "UTC")};
                                            })()}
                                            placeholder="Pilih tanggal mulai"
                                            showSearchButton={false}
                                            onUpdate={(dateData) => {
                                                if (dateData.singleDate) {
                                                    setEventData({...eventData, start: dateData.singleDate});
                                                }
                                            }}
                                        />
                                        {/* @ts-expect-error weird react 19 types error */}
                                        <Input
                                            disabled={!eventData.start || eventData.allDay === true}
                                            size="lg"
                                            id="time"
                                            type="time"
                                            icon={<FaRegClock/>}
                                            value={eventData.allDay === true ? "" : toTimeInputValue(eventData.start)}
                                            onChange={(e) => handleTimeChange("start", e.target.value)}
                                            error={!!fieldErrors?.start}
                                            className={`basis-1/2 md:basis-auto ${!!fieldErrors?.start ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                            labelProps={{
                                                className: "before:content-none after:content-none",
                                            }}
                                        />
                                        {/* @ts-expect-error weird react 19 types error */}
                                        <Checkbox
                                            label={
                                                /* @ts-expect-error weird react 19 types error */
                                                <Typography color="blue-gray" className="font-medium">
                                                    Seharian
                                                </Typography>
                                            }
                                            checked={eventData.allDay}
                                            onChange={(e) => setEventData(prevEvent => ({
                                                ...prevEvent,
                                                allDay: e.target.checked
                                            }))}
                                            containerProps={{
                                                className: "-ml-3",
                                            }}
                                        />
                                    </div>
                                    {
                                        fieldErrors?.start &&
                                        /* @ts-expect-error weird react 19 types error */
                                        <Typography color="red">{fieldErrors?.start._errors}</Typography>
                                    }
                                </div>
                                <div>
                                    <label htmlFor="end_date">
                                        {/* @ts-expect-error weird react 19 types error */}
                                        <Typography variant="h6" color="blue-gray">
                                            Tanggal Selesai
                                        </Typography>
                                    </label>
                                    <div className={"flex flex-col flex-wrap gap-y-2"}>
                                        <DatePicker
                                            mode="single"
                                            placeholder="Pilih tanggal selesai"
                                            showSearchButton={false}
                                            initialDate={eventData.end ? {
                                                singleDate: eventData.end
                                            } : undefined}
                                            disabled={eventData.start == undefined}
                                            onUpdate={(dateData) => {
                                                if (dateData.singleDate) {
                                                    setEventData({...eventData, end: dateData.singleDate});
                                                }
                                            }}
                                        />
                                        {/* @ts-expect-error weird react 19 types error */}
                                        <Input
                                            disabled={!eventData.end || eventData.allDay === true}
                                            size="lg"
                                            id="time"
                                            type="time"
                                            icon={<FaRegClock/>}
                                            value={eventData.allDay === true ? "" : toTimeInputValue(eventData.end)}
                                            onChange={(e) => handleTimeChange("end", e.target.value)}
                                            error={!!fieldErrors?.end}
                                            className={`basis-1/2 md:basis-auto ${!!fieldErrors?.end ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                            labelProps={{
                                                className: "before:content-none after:content-none",
                                            }}
                                        />;
                                    </div>
                                    {
                                        fieldErrors?.end &&
                                        /* @ts-expect-error weird react 19 types error */
                                        <Typography color="red">{fieldErrors?.end._errors}</Typography>
                                    }
                                </div>
                                <div>
                                    <label htmlFor="description">
                                        {/* @ts-expect-error weird react 19 types error */}
                                        <Typography variant="h6" color="blue-gray">
                                            Deskripsi
                                        </Typography>
                                    </label>
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Textarea
                                        value={eventData.description ?? undefined}
                                        onChange={(e) => setEventData(prevEvent => ({
                                            ...prevEvent,
                                            description: e.target.value.length > 0 ? e.target.value : null
                                        }))}
                                        size="lg"
                                        error={!!fieldErrors?.description}
                                        className=" !border-t-blue-gray-200 focus:!border-t-gray-900"
                                        labelProps={{
                                            className: "before:content-none after:content-none",
                                        }}
                                    />
                                    {
                                        fieldErrors?.description &&
                                        /* @ts-expect-error weird react 19 types error */
                                        <Typography color="red">{fieldErrors?.description._errors}</Typography>
                                    }
                                </div>
                                <div>
                                    <label htmlFor="color">
                                        {/* @ts-expect-error weird react 19 types error */}
                                        <Typography variant="h6" color="blue-gray">
                                            Warna
                                        </Typography>
                                    </label>
                                    <SelectComponent<string>
                                        setValue={(v) => setEventData(prev => ({
                                            ...prev,
                                            borderColor: v
                                        }))}
                                        options={selectOptions}
                                        selectedOption={
                                            selectOptions.find(r => r.value == eventData.borderColor)
                                        }
                                        placeholder={"Pilih Warna"}
                                        isError={!!fieldErrors?.borderColor}
                                        isSearchable={false}
                                        formatOptionLabel={(data) => {
                                            return (
                                                <div className="ml-2 flex items-center gap-x-2 py-1">
                                                    <div
                                                        className="h-3 w-3 rounded-full"
                                                        style={{
                                                            backgroundColor: data.value
                                                        }}
                                                    />
                                                    {/* @ts-expect-error weird react 19 types error */}
                                                    <Typography
                                                        color={"black"}
                                                        className={"leading-none"}
                                                    >
                                                        {data.label}
                                                    </Typography>
                                                </div>
                                            );
                                        }}
                                    />
                                    {
                                        fieldErrors?.borderColor &&
                                        /* @ts-expect-error weird react 19 types error */
                                        <Typography color="red">{fieldErrors?.borderColor._errors}</Typography>
                                    }
                                </div>
                                <div className="flex items-center gap-x-2">
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Checkbox
                                        label={
                                            /* @ts-expect-error weird react 19 types error */
                                            <Typography color="blue-gray" className="font-medium">
                                                Jadwal Berulang
                                            </Typography>
                                        }
                                        checked={eventData.recurring}
                                        onChange={(e) => {
                                            setEventData({
                                                ...eventData,
                                                recurring: e.target.checked,
                                                extendedProps: e.target.checked ? {
                                                    recurrence: {
                                                        daysOfWeek: [],
                                                        startRecur: getYYYYMMDD(eventData.start),
                                                        startTime: getHHMM(eventData.start),
                                                        endTime: eventData.end ? getHHMM(eventData.end) : undefined,
                                                        endRecur: undefined,
                                                        groupId: undefined,
                                                    } as Prisma.JsonObject
                                                } : null
                                            });
                                        }}
                                        containerProps={{
                                            className: "-ml-3",
                                        }}
                                    />
                                </div>

                                {eventData.recurring && eventData.extendedProps?.recurrence != null && (
                                    <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                                        <div className="space-y-2">
                                            {/* @ts-expect-error weird react 19 types error */}
                                            <Typography variant="h6" color="blue-gray">
                                                Pengulangan
                                            </Typography>
                                            <div className="flex gap-x-2">
                                                {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day, index) => {
                                                    const extendedProps = eventData.extendedProps as ExtendedProps;
                                                    return (
                                                        /* @ts-expect-error weird react 19 types error */
                                                        <Button
                                                            key={day}
                                                            size="sm"
                                                            variant={extendedProps?.recurrence?.daysOfWeek?.includes(index) ? "filled" : "outlined"}
                                                            onClick={() => {
                                                                const days = extendedProps?.recurrence?.daysOfWeek || [];
                                                                const newDays = days.includes(index)
                                                                    ? days.filter(d => d !== index)
                                                                    : [...days, index];
                                                                setEventData({
                                                                    ...eventData,
                                                                    extendedProps: {
                                                                        ...extendedProps,
                                                                        recurrence: {
                                                                            ...extendedProps?.recurrence,
                                                                            daysOfWeek: newDays
                                                                        }
                                                                    }
                                                                });
                                                            }}
                                                        >
                                                            {day}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {/* @ts-expect-error weird react 19 types error */}
                                            <Typography variant="h6" color="blue-gray">Mulai Pada</Typography>
                                            <DatePicker
                                                mode="single"
                                                placeholder="Pilih tanggal mulai berulang"
                                                showSearchButton={false}
                                                initialDate={eventData.extendedProps.recurrence?.startRecur ? {
                                                    singleDate: new TZDate(new Date(eventData.extendedProps.recurrence.startRecur), "UTC")
                                                } : undefined}
                                                onUpdate={(dateData) => {
                                                    if (dateData.singleDate) {
                                                        const extendedProps = eventData.extendedProps as ExtendedProps;
                                                        setEventData({
                                                            ...eventData,
                                                            extendedProps: {
                                                                ...extendedProps,
                                                                recurrence: {
                                                                    ...extendedProps?.recurrence,
                                                                    startRecur: getYYYYMMDD(dateData.singleDate)
                                                                }
                                                            }
                                                        });
                                                    }
                                                }}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            {/* @ts-expect-error weird react 19 types error */}
                                            <Typography variant="h6" color="blue-gray">Selesai Pada</Typography>
                                            <DatePicker
                                                mode="single"
                                                timeZone={undefined}
                                                placeholder="Pilih tanggal selesai berulang"
                                                showSearchButton={false}
                                                initialDate={eventData.extendedProps.recurrence?.endRecur ? {
                                                    singleDate: new TZDate(new Date(eventData.extendedProps.recurrence.endRecur), "UTC")
                                                } : undefined}
                                                onUpdate={(dateData) => {
                                                    if (dateData.singleDate) {
                                                        const extendedProps = eventData.extendedProps as ExtendedProps;
                                                        setEventData({
                                                            ...eventData,
                                                            extendedProps: {
                                                                ...extendedProps,
                                                                recurrence: {
                                                                    ...extendedProps?.recurrence,
                                                                    endRecur: getYYYYMMDD(dateData.singleDate)
                                                                }
                                                            }
                                                        });
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {
                                    mutationResponse?.failure &&
                                    /* @ts-expect-error weird react 19 types error */
                                    <Typography variant="h6" color="red" className="-mb-4">
                                        {mutationResponse.failure}
                                    </Typography>
                                }
                                {
                                    mutationResponse?.errors &&
                                    /* @ts-expect-error weird react 19 types error */
                                    <Typography variant="h6" color="red" className="-mb-4">
                                        Ada masalah di data yang anda masukan. Mohon periksa kembali.
                                    </Typography>
                                }
                            </MotionConfig>
                        </div>
                        <div className={"flex gap-x-4 justify-end"}>
                            {/*TODO! Delete form*/}
                            {/*<Button variant={"outlined"} className="mt-6">*/}
                            {/*    Hapus*/}
                            {/*</Button>*/}
                            {/* @ts-expect-error weird react 19 types error */}
                            <Button
                                // @ts-expect-error type error
                                onClick={() => eventMutation.mutate(eventData)}
                                color={"blue"} className="mt-6"
                                loading={eventMutation.isPending}
                            >
                                {isEdit ? "Ubah" : "Buat"}
                            </Button>
                        </div>
                    </form>
                )
            }
        </div>
    );
}
