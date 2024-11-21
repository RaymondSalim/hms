"use client";

import {HeaderContext} from "@/app/_context/HeaderContext";
import React, {MouseEventHandler, ReactElement, useContext, useEffect, useRef, useState} from "react";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {
    CalenderEvent,
    CalenderEventRange,
    getCalendarEvents
} from "@/app/(internal)/(dashboard_layout)/schedule/calendar/calendar-action";
import {CalendarApi, EventClickArg} from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import DayGrid from "@fullcalendar/daygrid";
import List from "@fullcalendar/list";
import TimeGrid from "@fullcalendar/timegrid";
import IDLocale from "@fullcalendar/core/locales/id";
import {Button, ButtonGroup, Menu, MenuHandler, MenuItem, MenuList, Typography,} from "@material-tailwind/react";
import {FaChevronDown} from "react-icons/fa";

import "./styles/fullcalender-overrides.css";
import {FaChevronLeft, FaChevronRight} from "react-icons/fa6";
import {toast} from "react-toastify";
import {offset, useFloating} from "@floating-ui/react";
import {EventImpl} from "@fullcalendar/core/internal";
import {CalenderEventTypes, CheckInOutType} from "@/app/(internal)/(dashboard_layout)/bookings/enum";
import {formatToDateTime} from "@/app/_lib/util";
import {TbDoorEnter, TbDoorExit} from "react-icons/tb";
import {Booking, Tenant} from "@prisma/client";
import {MdOutlineClose} from "react-icons/md";

export default function CalendarPage() {
    const headerContext = useContext(HeaderContext);
    useEffect(() => {
        headerContext.setTitle("Kalender");
        headerContext.setShowLocationPicker(true);
        headerContext.setPaths([
            <Link key={"schedule"} href={"/schedule/calendar"}>Jadwal</Link>,
            <Link key={"calendar"} href={"/schedule/calendar"}>Kalender</Link>,
        ]);
    }, []);

    const calendarApi = useRef<CalendarApi>();
    const [range, setRange] = useState<CalenderEventRange | undefined>();

    const [tooltipOpen, setTooltipOpen] = useState(false);
    const [tooltipData, setTooltipData] = useState<EventImpl | undefined>();

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
        console.log(e);
        refs.setReference(e.el);
        // TODO! Add cases for non booking events
        setTooltipData(e.event);
        setTooltipOpen(true);
    };

    return (
        <>
            <div className={"p-8 relative"}>
                <div
                    id="tooltip-container"
                    className="hidden bg-white border rounded shadow-md p-3 text-sm z-10"
                ></div>
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
                    //         color: "red"
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
                />
                <div className={"absolute left-8 top-8"}>
                    <ButtonGroup>
                        <Button disabled={isLoading} onClick={() => {
                            calendarApi?.current?.prev();
                        }}>
                            <FaChevronLeft/>
                        </Button>
                        <Button disabled={isLoading} onClick={() => {
                            calendarApi?.current?.next();
                        }}>
                            <FaChevronRight/>
                        </Button>
                        <Button disabled={isLoading} onClick={() => {
                            calendarApi?.current?.today();
                        }}>
                            HARI INI
                        </Button>
                    </ButtonGroup>
                </div>
                <div className={"absolute right-8 top-8"}>
                    <Menu>
                        <MenuHandler>
                            <Button color={"black"}
                                    className="flex justify-center items-center gap-x-2 py-3 px-6 h-[44px]">
                                <span className={"text-xs uppercase leading-none"}>Tipe</span>
                                <FaChevronDown/>
                            </Button>
                        </MenuHandler>
                        <MenuList>
                            <div
                                className="px-3 py-2 text-gray-500 font-semibold focus-visible:outline-none cursor-default">Kalender
                            </div>
                            <MenuItem className={"px-5"} onClick={handleMenuClick}
                                      data-id={"dayGridMonth"}>Bulan</MenuItem>
                            <MenuItem className={"px-5"} onClick={handleMenuClick}
                                      data-id={"timeGridWeek"}>Minggu</MenuItem>
                            <MenuItem className={"px-5"} onClick={handleMenuClick}
                                      data-id={"timeGridDay"}>Hari</MenuItem>
                            <hr onClick={(e) => e.stopPropagation()}
                                className="my-2 border-gray-300 focus-visible:outline-none"/>
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
                            <TooltipContent event={tooltipData} closeTooltip={() => setTooltipOpen(false)}/>
                            <div className="mt-3 flex justify-end">
                                <Button onClick={() => setTooltipOpen(false)} variant={"text"} className={"absolute right-2 top-2 flex justify-center items-center p-2"}>
                                    <MdOutlineClose className={"h-4 w-4 rounded-full"} size={"sm"}/>
                                </Button>
                            </div>
                        </div>
                    )
                }
            </div>
        </>
    );
}

interface TooltipContentProps {
    event?: EventImpl;
    closeTooltip: () => void;
}

function TooltipContent({event, closeTooltip}: TooltipContentProps) {
    const tooltipRef = useRef<HTMLDivElement | null>(null);

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

    let tooltipContent: ReactElement = <></>;

    switch (data.type.main) {
        case CalenderEventTypes.BOOKING: {
            const bookingData = data.originalData as Booking;
            const tenantData = data.originalData.tenants as Tenant;
            tooltipContent = (
                <>
                    <div className={"flex gap-x-2 justify-between items-center mb-2"}>
                        {
                            data.type.sub == CheckInOutType.CHECK_IN ?
                                <TbDoorEnter className={"text-blue-600 h-6 w-6"}/> :
                                <TbDoorExit className={"text-red-600 h-6 w-6"}/>
                        }
                        <Typography variant={"h5"} color={"black"}>{event.title}</Typography>
                        <div className={"w-10 h-1"}></div>
                    </div>
                    <div className="text-gray-700 text-sm">
                        <Typography variant={"lead"}>
                            Kontrak
                        </Typography>
                        <Typography className="mb-1">
                            <strong>Mulai:</strong> {formatToDateTime(bookingData.start_date, false)}
                        </Typography>
                        <Typography>
                            <strong>Selesai:</strong> {formatToDateTime(bookingData.end_date, false)}
                        </Typography>
                    </div>
                    <div className="text-gray-700 text-sm mb-4">
                        <Typography variant={"lead"}>
                            Penghuni
                        </Typography>
                        <Typography className="mb-1">
                            <strong>Nama:</strong> {tenantData.name}
                        </Typography>
                        <Typography>
                            <strong>Nomor Telepon:</strong> {tenantData.phone}
                        </Typography>
                    </div>
                    <Link
                        href={{
                            href: "/bookings",
                            query: {
                                "booking-id": bookingData.id.toString()
                            }
                        }}
                        className={"text-blue-600 dark:text-blue-500 hover:underline"}
                    >Lihat pemesanan selengkapnya</Link>
                </>
            );
        }
    }

    return (
        <div ref={tooltipRef} className={"relative"}>
            {tooltipContent}
            {/*TODO! This button is not working*/}
            {/*<Button onClick={() => closeTooltip()} variant={"text"} className={"absolute right-0 top-0 flex justify-center items-center p-2"}>*/}
            {/*    <MdOutlineClose className={"h-4 w-4 rounded-full"} size={"sm"}/>*/}
            {/*</Button>*/}
        </div>
    );
};
