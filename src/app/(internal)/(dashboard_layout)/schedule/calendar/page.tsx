"use client";

import {useHeader} from "@/app/_context/HeaderContext";
import React, {MouseEventHandler, ReactElement, useEffect, useRef, useState} from "react";
import Link from "next/link";
import {useMutation, useQuery} from "@tanstack/react-query";
import {
    CalenderEvent,
    CalenderEventRange,
    deleteCalendarEvent,
    getCalendarEvents
} from "@/app/(internal)/(dashboard_layout)/schedule/calendar/calendar-action";
import {CalendarApi, EventClickArg} from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import DayGrid from "@fullcalendar/daygrid";
import List from "@fullcalendar/list";
import TimeGrid from "@fullcalendar/timegrid";
import IDLocale from "@fullcalendar/core/locales/id";
import {
    Button,
    ButtonGroup,
    Dialog,
    Menu,
    MenuHandler,
    MenuItem,
    MenuList,
    Typography,
} from "@material-tailwind/react";
import {FaChevronDown} from "react-icons/fa";

import "./styles/fullcalender-overrides.css";
import {FaChevronLeft, FaChevronRight} from "react-icons/fa6";
import {toast} from "react-toastify";
import {offset, useFloating} from "@floating-ui/react";
import {EventImpl} from "@fullcalendar/core/internal";
import {CalenderEventTypes, CheckInOutType} from "@/app/(internal)/(dashboard_layout)/bookings/enum";
import {formatToDateTime} from "@/app/_lib/util";
import {TbDoorEnter, TbDoorExit} from "react-icons/tb";
import {Booking, Event, Tenant} from "@prisma/client";
import {MdOutlineClose} from "react-icons/md";

export default function CalendarPage() {
    const headerContext = useHeader();
    useEffect(() => {
        headerContext.setTitle("Kalender");
        headerContext.setShowLocationPicker(true);
        headerContext.setPaths([
            <Link key={"schedule"} href={"/schedule/calendar"}>Jadwal</Link>,
            <Link key={"calendar"} href={"/schedule/calendar"}>Kalender</Link>,
        ]);
    }, []);

    const calendarApi = useRef<CalendarApi>(undefined);
    const [range, setRange] = useState<CalenderEventRange | undefined>();

    const [tooltipOpen, setTooltipOpen] = useState(false);
    const [tooltipData, setTooltipData] = useState<EventImpl | undefined>();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteEventData, setDeleteEventData] = useState<{ id: number; calendarID: string } | null>(null);

    const {refs, floatingStyles} = useFloating({
        open: tooltipOpen,
        middleware: [offset(10)],
        onOpenChange: setTooltipOpen,
    });

    const {
        data: calendarEvents,
        isLoading,
        isSuccess,
        isFetched
    } = useQuery({
        queryKey: ['calendarEvents', 'location_id', headerContext.locationID, 'range', range],
        queryFn: () => getCalendarEvents(headerContext.locationID, range),
        enabled: range != undefined
    });

    useEffect(() => {
        if (isFetched && !isSuccess) {
            toast.error("Gagal menarik data!");
        }
    }, [isLoading, isSuccess, calendarEvents]);

    const handleMenuClick: MouseEventHandler = (event) => {
        const dataId = event.currentTarget.getAttribute('data-id');
        if (dataId) {
            calendarApi.current?.changeView(dataId);
        }
    };

    const handleEventClick = (e: EventClickArg) => {
        refs.setReference(e.el);
        setTooltipData(e.event);
        setTooltipOpen(true);
    };

    const deleteMutation = useMutation({
        mutationFn: async (arg: { id: number; calendarID: string }) => {
            return await deleteCalendarEvent(arg.id);
        },
        onSuccess: (data, variables) => {
            if (data.success) {
                toast.success("Jadwal Berhasil Dihapus!", {});
                calendarApi.current?.getEventById(variables.calendarID)?.remove();
            }
        },
    });

    const handleDelete = (id: number, calendarID: string) => {
        setDeleteEventData({id, calendarID});
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (deleteEventData) {
            deleteMutation.mutate(deleteEventData);
            setDeleteDialogOpen(false);
        }
    };

    return (
        <>
            <div className={"relative"}>
                <div
                    id="tooltip-container"
                    className="hidden bg-white border rounded shadow-md p-3 text-sm z-10"
                ></div>
                <div className={"pt-12 md:pt-0"}>
                    <FullCalendar
                        timeZone="local"
                        initialDate={range?.startDate}
                        datesSet={(date) => {
                            setRange({
                                startDate: date.startStr,
                                endDate: date.endStr,
                            });
                        }}
                        ref={(cal) => {
                            calendarApi.current = cal?.getApi();
                        }}
                        plugins={[DayGrid, List, TimeGrid/*, ResourceTimeline*/]}
                        locale={IDLocale}
                        initialView={"dayGridMonth"}
                        slotLabelFormat={{
                            omitZeroMinute: false,
                            hour: "2-digit",
                            minute: "2-digit",
                            separator: ":"
                        }}
                        schedulerLicenseKey={'CC-Attribution-NonCommercial-NoDerivatives'}
                        editable={true}
                        selectable={true}
                        weekends={true}
                        // @ts-expect-error types
                        events={calendarEvents}
                        // events={[
                        //     {
                        //         start: ((): Date | string => {
                        //             const today = new Date();
                        //
                        //             return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 1, 30));
                        //         })(),
                        //         end: ((): Date | string => {
                        //             const today = new Date();
                        //             return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12));
                        //         })(),
                        //         title: "test 1",
                        //         color: "#33b679"
                        //     },
                        //     {
                        //         start: ((): Date | string => {
                        //             const today = new Date();
                        //             return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
                        //         })(),
                        //         end: ((): Date | string => {
                        //             const today = new Date();
                        //             return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23));
                        //         })(),
                        //         title: "test 2",
                        //         color: "blue"
                        //     },
                        //     {
                        //         start: ((): Date | string => {
                        //             const today = new Date();
                        //             return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - 1, 16));
                        //         })(),
                        //         // end: ((): Date | string => {
                        //         //     const today = new Date();
                        //         //     return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23));
                        //         // })(),
                        //         allDay: true,
                        //         title: "test 3 (allday)",
                        //         color: "orange"
                        //     },
                        //     // {
                        //     //     start: ((): Date | string => {
                        //     //         const today = new Date();
                        //     //         return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
                        //     //     })(),
                        //     //     end: ((): Date | string => {
                        //     //         const today = new Date();
                        //     //         return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23));
                        //     //     })(),
                        //     //     title: "test 3",
                        //     //     color: "blue"
                        //     // },
                        //     // {
                        //     //     start: ((): Date | string => {
                        //     //         const today = new Date();
                        //     //         return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
                        //     //     })(),
                        //     //     end: ((): Date | string => {
                        //     //         const today = new Date();
                        //     //         return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23));
                        //     //     })(),
                        //     //     title: "test 4",
                        //     //     color: "blue"
                        //     // },
                        // ]}
                        headerToolbar={{
                            left: "",
                            center: "title",
                            right: ""
                        }}
                        eventClick={handleEventClick}
                        expandRows={true}
                    />
                </div>
                <div className={"absolute left-0 top-0"}>
                    {/* @ts-expect-error weird react 19 types error */}
                    <ButtonGroup className={"h-[44px]"}>
                        {/* @ts-expect-error weird react 19 types error */}
                        <Button disabled={isLoading} onClick={() => {
                            calendarApi?.current?.prev();
                        }}>
                            <FaChevronLeft/>
                        </Button>
                        {/* @ts-expect-error weird react 19 types error */}
                        <Button disabled={isLoading} onClick={() => {
                            calendarApi?.current?.next();
                        }}>
                            <FaChevronRight/>
                        </Button>
                        {/* @ts-expect-error weird react 19 types error */}
                        <Button disabled={isLoading} onClick={() => {
                            calendarApi?.current?.today();
                        }}>
                            HARI INI
                        </Button>
                    </ButtonGroup>
                </div>
                <div className={"absolute right-0 top-0 h-[44px]"}>
                    <Menu>
                        <MenuHandler>
                            {/* @ts-expect-error weird react 19 types error */}
                            <Button color={"black"}
                                    className="flex justify-center items-center gap-x-2 py-3 px-6 h-[44px]">
                                <span className={"text-xs uppercase leading-none"}>Tipe</span>
                                <FaChevronDown/>
                            </Button>
                        </MenuHandler>
                        {/* @ts-expect-error weird react 19 types error */}
                        <MenuList>
                            <div
                                className="px-3 py-2 text-gray-500 font-semibold focus-visible:outline-none cursor-default">Kalender
                            </div>
                            {/* @ts-expect-error weird react 19 types error */}
                            <MenuItem className={"px-5"} onClick={handleMenuClick}
                                      data-id={"dayGridMonth"}>Bulan</MenuItem>
                            {/* @ts-expect-error weird react 19 types error */}
                            <MenuItem className={"px-5"} onClick={handleMenuClick}
                                      data-id={"timeGridWeek"}>Minggu</MenuItem>
                            {/* @ts-expect-error weird react 19 types error */}
                            <MenuItem className={"px-5"} onClick={handleMenuClick}
                                      data-id={"timeGridDay"}>Hari</MenuItem>
                            <hr onClick={(e) => e.stopPropagation()}
                                className="my-2 border-gray-300 focus-visible:outline-none"/>
                            {/* @ts-expect-error weird react 19 types error */}
                            <MenuItem onClick={handleMenuClick} data-id={"listWeek"}>Agenda Mingguan</MenuItem>
                            {/*<MenuItem onClick={handleMenuClick} data-id={"resourceTimeline"}>Gantt Chart</MenuItem>*/}
                        </MenuList>
                    </Menu>
                </div>
                {
                    tooltipOpen && (
                        <div
                            ref={refs.setFloating}
                            style={floatingStyles}
                            className="relative bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-sm max-w-96 z-50"
                        >
                            <TooltipContent
                                event={tooltipData}
                                onDelete={handleDelete}
                                closeTooltip={() => setTooltipOpen(false)}
                            />
                            <div className="mt-3 flex justify-end">
                                {/* @ts-expect-error weird react 19 types error */}
                                <Button onClick={() => setTooltipOpen(false)} variant={"text"}
                                        className={"absolute right-2 top-2 flex justify-center items-center p-2"}>
                                    <MdOutlineClose className={"h-4 w-4 rounded-full"} size={"sm"}/>
                                </Button>
                            </div>
                        </div>
                    )
                }
            </div>
            <DeleteDialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onDelete={confirmDelete}
                isPending={deleteMutation.isPending}
            />
        </>
    );
}

interface TooltipContentProps {
    event?: EventImpl;
    closeTooltip: () => void;
    onDelete: (id: number, calendarID: string) => void;
}

function TooltipContent({onDelete, event, closeTooltip}: TooltipContentProps) {
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const deleteDialogState = useState(false);

    // Close tooltip if clicked outside
    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
                closeTooltip();
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [closeTooltip]);

    if (!event || !event.extendedProps) return <></>;
    const data = event.extendedProps as CalenderEvent;
    const originalData = data.originalData;

    let tooltipContent: ReactElement;

    switch (data.type?.main) {
        case CalenderEventTypes.BOOKING: {
            const bookingData = originalData as Booking;
            const tenantData = originalData.tenants as Tenant;
            tooltipContent = (
                <>
                    <div className={"flex gap-x-2 justify-between items-center mb-2"}>
                        {
                            data.type.sub == CheckInOutType.CHECK_IN ?
                                <TbDoorEnter className={"text-blue-600 h-6 w-6"}/> :
                                <TbDoorExit className={"text-red-600 h-6 w-6"}/>
                        }
                        {/* @ts-expect-error weird react 19 types error */}
                        <Typography variant={"h5"} color={"black"}>{event.title}</Typography>
                        <div className={"w-10 h-1"}></div>
                    </div>
                    <div className="text-gray-700 text-sm">
                        {/* @ts-expect-error weird react 19 types error */}
                        <Typography variant={"lead"}>
                            Kontrak
                        </Typography>
                        {/* @ts-expect-error weird react 19 types error */}
                        <Typography className="mb-1">
                            <strong>Mulai:</strong> {formatToDateTime(bookingData.start_date, false)}
                        </Typography>
                        {/* @ts-expect-error weird react 19 types error */}
                        <Typography>
                            <strong>Selesai:</strong> {bookingData.end_date ? formatToDateTime(bookingData.end_date, false) : "Rolling"}
                        </Typography>
                    </div>
                    <div className="text-gray-700 text-sm mb-4">
                        {/* @ts-expect-error weird react 19 types error */}
                        <Typography variant={"lead"}>
                            Penghuni
                        </Typography>
                        {/* @ts-expect-error weird react 19 types error */}
                        <Typography className="mb-1">
                            <strong>Nama:</strong> {tenantData.name}
                        </Typography>
                        {/* @ts-expect-error weird react 19 types error */}
                        <Typography>
                            <strong>Nomor Telepon:</strong> {tenantData.phone}
                        </Typography>
                    </div>
                    <Link
                        href={{
                            pathname: "/bookings",
                            query: {
                                "id": bookingData.id.toString()
                            }
                        }}
                        className={"text-blue-600 dark:text-blue-500 hover:underline"}
                    >Lihat pemesanan selengkapnya</Link>
                </>
            );
            break;
        }
        default: {
            const eventData = originalData as Event;
            const recurrence = eventData.recurring ? (typeof eventData.extendedProps === 'string' ? JSON.parse(eventData.extendedProps) : eventData.extendedProps)?.recurrence : undefined;
            tooltipContent = (
                <>
                    <div className="flex gap-x-2 items-center">
                        <div
                            className="h-3 w-3 rounded-full"
                            style={{
                                backgroundColor: eventData.borderColor ?? undefined,
                            }}
                        />
                        {/* @ts-expect-error weird react 19 types error */}
                        <Typography variant="h5" color="black">
                            {eventData.title}
                        </Typography>
                        <div className="w-10 h-1"></div>
                    </div>
                    <div className="mb-4">
                        {/* @ts-expect-error weird react 19 types error */}
                        <Typography variant="small" className="text-gray-600">
                            {`${formatToDateTime(eventData.start!, !eventData.allDay)} ${
                                eventData.end ? `- ${formatToDateTime(eventData.end!, !eventData.allDay)}` : ""
                            }`}
                        </Typography>
                    </div>

                    {eventData.recurring && recurrence && (
                        <div className="mb-4">
                            {/* @ts-expect-error weird react 19 types error */}
                            <Typography variant="h6" className="text-gray-800 mb-2">
                                Pengulangan
                            </Typography>
                            <div className="space-y-2">
                                {/* @ts-expect-error weird react 19 types error */}
                                <Typography className="text-gray-700">
                                    <strong>Hari:</strong> {recurrence.daysOfWeek?.map((day: number) => {
                                    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                                    return days[day];
                                }).join(', ')}
                                </Typography>
                                {/* @ts-expect-error weird react 19 types error */}
                                <Typography className="text-gray-700">
                                    <strong>Mulai:</strong> {formatToDateTime(new Date(recurrence.startRecur), false)}
                                </Typography>
                                {recurrence.endRecur && (
                                    // @ts-expect-error weird react 19 types error
                                    <Typography className="text-gray-700">
                                        <strong>Selesai:</strong> {formatToDateTime(new Date(recurrence.endRecur), false)}
                                    </Typography>
                                )}
                            </div>
                        </div>
                    )}

                    {eventData.description && (
                        <div className="mb-4">
                            {/* @ts-expect-error weird react 19 types error */}
                            <Typography variant="h6" className="text-gray-800 mb-2">
                                Deskripsi
                            </Typography>
                            {/* @ts-expect-error weird react 19 types error */}
                            <Typography className="text-gray-700">{eventData.description}</Typography>
                        </div>
                    )}

                    <div className="mt-4 border-t pt-4">
                        {/* @ts-expect-error weird react 19 types error */}
                        <Typography variant="small" className="text-gray-500 mb-4 block">
                            Last updated: {formatToDateTime(eventData.updatedAt!)}
                        </Typography>
                        <div className="flex gap-x-4 justify-end">
                            <Link
                                key={`event-${eventData.id}`}
                                href={{
                                    pathname: "/schedule/create",
                                    query: {
                                        event_id: eventData.id,
                                    },
                                }}
                                className="text-blue-600 dark:text-blue-500 hover:underline text-sm"
                            >
                                Ubah
                            </Link>
                            <button
                                onClick={() => onDelete(eventData.id, event.id)}
                                className="text-red-600 dark:text-red-500 hover:underline text-sm"
                            >
                                Hapus
                            </button>
                        </div>
                    </div>
                </>
            );
            break;
        }
    }

    return (
        <>
            <div ref={tooltipRef} className={"relative"}>
                {tooltipContent}
                {/*TODO! This button is not working*/}
                {/*<Button onClick={() => closeTooltip()} variant={"text"} className={"absolute right-0 top-0 flex justify-center items-center p-2"}>*/}
                {/*    <MdOutlineClose className={"h-4 w-4 rounded-full"} size={"sm"}/>*/}
                {/*</Button>*/}
            </div>
        </>
    );
};

function DeleteDialog({
                          open,
                          onClose,
                          onDelete,
                          isPending,
                      }: {
    open: boolean;
    onClose: () => void;
    onDelete: () => void;
    isPending?: boolean;
}) {
    return (
        // @ts-expect-error weird react 19 types error
        <Dialog
            open={open}
            size={"md"}
            handler={onClose}
            className={"p-8"}
        >
            <h2 className={"text-xl font-semibold text-black mb-4"}>Hapus Jadwal</h2>
            <span>Apakah Anda yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan.</span>
            <div className={"flex gap-x-4 justify-end"}>
                {/* @ts-expect-error weird react 19 types error */}
                <Button onClick={onClose} variant={"outlined"} className="mt-6">
                    Batal
                </Button>
                {/* @ts-expect-error weird react 19 types error */}
                <Button onClick={onDelete}
                        color={"red"}
                        className="mt-6"
                        loading={isPending}
                >
                    Hapus
                </Button>
            </div>
        </Dialog>
    )
        ;
}
