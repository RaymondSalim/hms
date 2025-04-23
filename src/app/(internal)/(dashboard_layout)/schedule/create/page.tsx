"use client";

import React, {useEffect, useState} from "react";
import {useHeader} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {useMutation, useQuery} from "@tanstack/react-query";
import {useRouter, useSearchParams} from "next/navigation";
import {toast} from "react-toastify";
import {MotionConfig} from "framer-motion";
import {
    Button,
    Checkbox,
    Input,
    Popover,
    PopoverContent,
    PopoverHandler,
    Textarea,
    Typography
} from "@material-tailwind/react";
import {SelectComponent, SelectOption} from "@/app/_components/input/select";
import {Event, Prisma} from "@prisma/client";
import type {z} from "zod";
import {ZodFormattedError} from "zod";
import {GenericActionsType} from "@/app/_lib/actions";
import {upsertEventAction} from "@/app/(internal)/(dashboard_layout)/schedule/create/event-action";
import {getEventByID} from "@/app/_db/event";
import {formatToDateTime} from "@/app/_lib/util";
import {DayPicker} from "react-day-picker";
import {eventSchema} from "@/app/_lib/zod/event/zod";

import {FaRegCalendar, FaRegClock} from "react-icons/fa6";
import "react-day-picker/style.css";
import "./styles/create.css";

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

export default function CreateEventPage() {
    const headerContext = useHeader();
    const router = useRouter();

    const searchParams = useSearchParams();
    const [queryParams, setQueryParams] = useState<EventPageQueryParam>();
    const [isPopoverOpen, setIsPopoverOpen] = useState({
        start: false,
        end: false,
        startRecur: false,
        endRecur: false
    });
    const [eventData, setEventData] = useState<EventData>({
        title: "",
        description: "",
        start: new Date(),
        end: undefined,
        allDay: false,
        backgroundColor: undefined,
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
    });
    const [isUpdate, setIsUpdate] = useState(false);

    const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<Event> | undefined>();
    const [mutationResponse, setMutationResponse] = useState<GenericActionsType<Event>>();

    useEffect(() => {
        let isUpdateEvent = false;
        let eventID = searchParams.get("event_id");
        if (eventID && Number(eventID) > 0) {
            setQueryParams({
                eventID: Number(eventID),
            });
            isUpdateEvent = true;
        }

        headerContext.setTitle(`${isUpdateEvent ? "Ubah" : "Buat"} Jadwal`);
        headerContext.setShowLocationPicker(true);
        headerContext.setPaths([
            <Link key={"schedule"} href={"/schedule/calendar"}>Jadwal</Link>,
            <Link key={"create"} href={"/schedule/create"}>{`${isUpdate ? "Ubah" : "Buat"} Jadwal`}</Link>,
        ]);

        setIsUpdate(isUpdateEvent);
        setEventData(prev => ({
            ...prev,
            backgroundColor: eventColors.get("Blueberry")
        }));
    }, []);

    // This block of code is for editing existing eventData
    let {
        data,
        status
    } = useQuery({
        queryKey: ['eventData', queryParams?.eventID],
        queryFn: () => getEventByID(queryParams!.eventID!),
        enabled: !!queryParams?.eventID,
    });
    useEffect(() => {
        if (status == "success") {
            // @ts-expect-error type error
            setEventData(data);
        } else if (status == "error") {
            toast.error("Gagal menarik data!");
        }
    }, [data, status]);

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

        setEventData((prev) => {
            if (!prev[field]) return prev;

            let currentDate;
            if (typeof prev[field] === "string") {
                currentDate = new Date(String(prev[field]));
            } else if (prev[field] instanceof Date) {
                currentDate = prev[field]!;
            }
            currentDate?.setHours(hours, minutes, 0, 0);

            return {
                ...prev,
                [field]: currentDate,
            };
        });
    };

    const today = new Date();

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
        <div className="w-full flex justify-center">
            <div className={"w-4/5 min-w-[540px] px-8 py-4"}>
                <form className={"mt-4"}>
                    <div className="mb-1 flex flex-col gap-6">
                        <MotionConfig
                            key={"event_form"}
                            transition={{duration: 0.5}}
                        >
                            <div>
                                <label htmlFor="title">
                                    <Typography variant="h6" color="blue-gray">
                                        Judul
                                    </Typography>
                                </label>
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
                                    <Typography color="red">{fieldErrors?.title._errors}</Typography>
                                }
                            </div>
                            <div>
                                <label htmlFor="start_date">
                                    <Typography variant="h6" color="blue-gray">
                                        Tanggal Mulai
                                    </Typography>
                                </label>
                                <div className={"flex flex-col gap-y-2"}>
                                    <div className={"flex gap-x-4"}>
                                        <Popover
                                            key="start_date"
                                            open={isPopoverOpen.start}
                                            handler={() => setIsPopoverOpen(p => ({
                                                ...p,
                                                start: !p.start
                                            }))}
                                            placement="bottom-end"
                                        >
                                            <PopoverHandler>
                                                <Input
                                                    icon={<FaRegCalendar/>}
                                                    variant="outlined"
                                                    size="lg"
                                                    onChange={() => null}
                                                    value={eventData.start ? formatToDateTime(new Date(eventData.start), false) : ""}
                                                    error={!!fieldErrors?.start}
                                                    className={`relative ${!!fieldErrors?.start ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
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
                                                    selected={eventData.start ? new Date(eventData.start) : undefined}
                                                    onSelect={(d) => {
                                                        setIsPopoverOpen(p => ({
                                                            ...p,
                                                            start: false
                                                        }));
                                                        if (d) setEventData({...eventData, start: d});
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
                                        <Input
                                            disabled={!eventData.start || eventData.allDay === true}
                                            size="lg"
                                            id="time"
                                            type="time"
                                            icon={<FaRegClock/>}
                                            value={eventData.allDay === true ? "" : eventData.start ? new Date(eventData.start).toLocaleTimeString("en-GB", {
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            }) : ""}
                                            onChange={(e) => handleTimeChange("start", e.target.value)}
                                            error={!!fieldErrors?.start}
                                            className={`${!!fieldErrors?.start ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                            labelProps={{
                                                className: "before:content-none after:content-none",
                                            }}
                                        />;
                                    </div>
                                    <Checkbox
                                        label={
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
                                    <Typography color="red">{fieldErrors?.start._errors}</Typography>
                                }
                            </div>
                            <div>
                                <label htmlFor="end_date">
                                    <Typography variant="h6" color="blue-gray">
                                        Tanggal Selesai
                                    </Typography>
                                </label>
                                <div className={"flex flex-col gap-y-2"}>
                                    <div className={"flex gap-x-4"}>
                                        <Popover
                                            key={"end_date"}
                                            open={isPopoverOpen.end}
                                            handler={() => setIsPopoverOpen(p => ({
                                                ...p,
                                                end: !p.start
                                            }))}
                                            placement="bottom-end"
                                        >
                                            <PopoverHandler>
                                                <Input
                                                    disabled={eventData.start == undefined}
                                                    icon={<FaRegCalendar/>}
                                                    variant="outlined"
                                                    size="lg"
                                                    onChange={() => null}
                                                    value={eventData.end ? formatToDateTime(new Date(eventData.end), false) : ""}
                                                    error={!!fieldErrors?.end}
                                                    className={`relative ${!!fieldErrors?.end ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
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
                                                    selected={eventData.end ? new Date(eventData.end) : undefined}
                                                    onSelect={(d) => {
                                                        setIsPopoverOpen(p => ({
                                                            ...p,
                                                            end: false
                                                        }));
                                                        if (d) setEventData({...eventData, end: d});
                                                    }}
                                                    showOutsideDays
                                                    classNames={{
                                                        disabled: "rdp-disabled cursor-not-allowed",
                                                    }}
                                                    startMonth={eventData.start}
                                                    endMonth={new Date(today.getFullYear() + 5, today.getMonth())}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <Input
                                            disabled={!eventData.end || eventData.allDay === true}
                                            size="lg"
                                            id="time"
                                            type="time"
                                            icon={<FaRegClock/>}
                                            value={eventData.allDay === true ? "" : eventData.end ? new Date(eventData.end).toLocaleTimeString("en-GB", {
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            }) : ""}
                                            onChange={(e) => handleTimeChange("end", e.target.value)}
                                            error={!!fieldErrors?.end}
                                            className={`${!!fieldErrors?.end ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                            labelProps={{
                                                className: "before:content-none after:content-none",
                                            }}
                                        />;
                                    </div>
                                </div>
                                {
                                    fieldErrors?.end &&
                                    <Typography color="red">{fieldErrors?.end._errors}</Typography>
                                }
                            </div>
                            <div>
                                <label htmlFor="description">
                                    <Typography variant="h6" color="blue-gray">
                                        Deskripsi
                                    </Typography>
                                </label>
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
                                    <Typography color="red">{fieldErrors?.description._errors}</Typography>
                                }
                            </div>
                            <div>
                                <label htmlFor="color">
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
                                    <Typography color="red">{fieldErrors?.borderColor._errors}</Typography>
                                }
                            </div>
                            <div className="flex items-center gap-x-2">
                                <Checkbox
                                    label={
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
                                                    startRecur: eventData.start?.toISOString(),
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
                                        <Typography variant="h6" color="blue-gray">
                                            Pengulangan
                                        </Typography>
                                        <div className="flex gap-x-2">
                                            {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day, index) => {
                                                const extendedProps = eventData.extendedProps as ExtendedProps;
                                                return (
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
                                        <Typography variant="h6" color="blue-gray">Mulai Pada</Typography>
                                        <Popover
                                            open={isPopoverOpen.startRecur}
                                            handler={() => setIsPopoverOpen(p => ({...p, startRecur: !p.startRecur}))}
                                            placement="bottom-start"
                                        >
                                            <PopoverHandler>
                                                <Input
                                                    icon={<FaRegCalendar/>}
                                                    variant="outlined"
                                                    size="lg"
                                                    onChange={() => null}
                                                    value={(eventData.extendedProps as ExtendedProps)?.recurrence?.startRecur ? formatToDateTime(new Date((eventData.extendedProps as ExtendedProps).recurrence!.startRecur!), false) : ""}
                                                    className="relative !border-t-blue-gray-200 focus:!border-t-gray-900"
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
                                                    selected={(eventData.extendedProps as ExtendedProps)?.recurrence?.startRecur ? new Date((eventData.extendedProps as ExtendedProps).recurrence!.startRecur!) : undefined}
                                                    onSelect={(d: Date | undefined) => {
                                                        setIsPopoverOpen(p => ({...p, startRecur: false}));
                                                        if (d) {
                                                            const extendedProps = eventData.extendedProps as ExtendedProps;
                                                            setEventData({
                                                                ...eventData,
                                                                extendedProps: {
                                                                    ...extendedProps,
                                                                    recurrence: {
                                                                        ...extendedProps?.recurrence,
                                                                        startRecur: d.toISOString()
                                                                    }
                                                                }
                                                            });
                                                        }
                                                    }}
                                                    showOutsideDays
                                                    classNames={{
                                                        disabled: "rdp-disabled cursor-not-allowed",
                                                    }}
                                                    startMonth={eventData.start}
                                                    endMonth={new Date(today.getFullYear() + 5, today.getMonth())}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="space-y-2">
                                        <Typography variant="h6" color="blue-gray">Selesai Pada</Typography>
                                        <Popover
                                            open={isPopoverOpen.endRecur}
                                            handler={() => setIsPopoverOpen(p => ({...p, endRecur: !p.endRecur}))}
                                            placement="bottom-start"
                                        >
                                            <PopoverHandler>
                                                <Input
                                                    icon={<FaRegCalendar/>}
                                                    variant="outlined"
                                                    size="lg"
                                                    onChange={() => null}
                                                    value={(eventData.extendedProps as ExtendedProps)?.recurrence?.endRecur ? formatToDateTime(new Date((eventData.extendedProps as ExtendedProps).recurrence!.endRecur!), false) : ""}
                                                    className="relative !border-t-blue-gray-200 focus:!border-t-gray-900"
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
                                                    selected={(eventData.extendedProps as ExtendedProps)?.recurrence?.endRecur ? new Date((eventData.extendedProps as ExtendedProps).recurrence!.endRecur!) : undefined}
                                                    onSelect={(d: Date | undefined) => {
                                                        setIsPopoverOpen(p => ({...p, endRecur: false}));
                                                        if (d) {
                                                            const extendedProps = eventData.extendedProps as ExtendedProps;
                                                            setEventData({
                                                                ...eventData,
                                                                extendedProps: {
                                                                    ...extendedProps,
                                                                    recurrence: {
                                                                        ...extendedProps?.recurrence,
                                                                        endRecur: d.toISOString()
                                                                    }
                                                                }
                                                            });
                                                        }
                                                    }}
                                                    showOutsideDays
                                                    classNames={{
                                                        disabled: "rdp-disabled cursor-not-allowed",
                                                    }}
                                                    startMonth={eventData.start}
                                                    endMonth={new Date(today.getFullYear() + 5, today.getMonth())}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            )}

                            {
                                mutationResponse?.failure &&
                                <Typography variant="h6" color="red" className="-mb-4">
                                    {mutationResponse.failure}
                                </Typography>
                            }
                            {
                                mutationResponse?.errors &&
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
                        <Button
                            // @ts-expect-error type error
                            onClick={() => eventMutation.mutate(eventData)}
                            color={"blue"} className="mt-6"
                            loading={eventMutation.isPending}
                        >
                            {isUpdate ? "Ubah" : "Buat"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
