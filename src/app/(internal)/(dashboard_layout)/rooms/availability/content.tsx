import {RoomTypeWithRoomCount} from "@/app/_db/room";
import React, {useEffect, useRef, useState} from "react";
import {
    Button,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    Checkbox,
    Chip,
    Input,
    Menu,
    MenuHandler,
    MenuItem,
    MenuList,
    Popover,
    PopoverContent,
    PopoverHandler,
    Typography
} from "@material-tailwind/react";
import {formatToDateTime} from "@/app/_lib/util";
import {DateRange, DayPicker} from "react-day-picker";
import "react-day-picker/style.css";
import {CiCalendarDate, CiSearch} from "react-icons/ci";
import {RiErrorWarningLine} from "react-icons/ri";
import {BookingsIncludeAll} from "@/app/_db/bookings";
import {FaChevronDown} from "react-icons/fa6";
import Link from "next/link";
import {AiOutlineLoading} from "react-icons/ai";
import {useQuery} from "@tanstack/react-query";
import {getAllBookingsAction} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";

export interface RoomAvailabilityProps {
    roomTypes: RoomTypeWithRoomCount[]
    locationID?: number
}

type RoomTypeWithRoomCountAndAvailability = RoomTypeWithRoomCount & {
    roomLeft?: number,
}

export function calculateRoomAvailability(
    roomTypes: RoomTypeWithRoomCount[],
    bookings?: BookingsIncludeAll[],
    dateRange?: DateRange
): RoomTypeWithRoomCountAndAvailability[] {
    return roomTypes.map((rt) => {
        const totalRooms = rt._count.rooms;

        // Calculate the number of rooms booked for the current room type
        const roomsBooked = bookings?.reduce((count, booking) => {
            if (booking.rooms?.room_type_id === rt.id) {
                // Check if the booking overlaps with the selected date range
                if (dateRange?.from) {
                    const bookingStart = new Date(booking.start_date);
                    const bookingEnd = new Date(booking.end_date);
                    const rangeStart = new Date(dateRange.from);
                    rangeStart.setHours(0, 0, 0, 0);
                    const rangeEnd = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
                    rangeEnd.setHours(23, 59, 59, 999);
                    
                    // Check for overlap: booking overlaps if it starts before range ends AND ends after range starts
                    const hasOverlap = bookingStart < rangeEnd && bookingEnd > rangeStart;
                    
                    if (hasOverlap) {
                        return count + 1;
                    }
                } else {
                    // If no date range selected, count all bookings
                    return count + 1;
                }
            }
            return count;
        }, 0) || 0;

        const roomLeft = totalRooms - roomsBooked;

        return {
            ...rt,
            roomLeft,
        };
    });
}

export default function RoomAvailabilityContent(props: RoomAvailabilityProps) {
    const today = new Date();

    const [dates, setDates] = useState<DateRange | undefined>(undefined);
    const [roomTypes, setRoomTypes] = useState<RoomTypeWithRoomCountAndAvailability[]>(props.roomTypes);
    const [popoverOpen, setIsPopoverOpen] = useState(false);
    const [searchTriggered, setSearchTriggered] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const [filteredRoomTypeIDs, setFilteredRoomTypeIDs] = useState<Set<number>>(new Set());

    const dateInputRef = useRef<HTMLInputElement>(null);

    // Query for bookings when dates are selected
    const {data: bookings, isLoading: isBookingsLoading, refetch: refetchBookings} = useQuery({
        queryKey: ['bookings', 'location_id', props.locationID, 'date', dates],
        enabled: dates?.from != undefined && props.locationID != undefined && searchTriggered,
        queryFn: async () => {
            const dateRange = dates;
            if (!dateRange?.from) return Promise.resolve([]);
            
            // Create a wider date range to capture all potentially overlapping bookings
            const startDate = new Date(dateRange.from);
            const endDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
            
            // Extend the range by a reasonable amount to catch overlapping bookings
            const extendedStart = new Date(startDate);
            extendedStart.setDate(extendedStart.getDate() - 30); // 30 days before
            
            const extendedEnd = new Date(endDate);
            extendedEnd.setDate(extendedEnd.getDate() + 30); // 30 days after
            
            const rawBookings = await getAllBookingsAction(props.locationID, undefined, {
                OR: [
                    {
                        // Bookings that start within our extended range
                        start_date: {
                            gte: extendedStart,
                            lte: extendedEnd,
                        }
                    },
                    {
                        // Bookings that end within our extended range
                        end_date: {
                            gte: extendedStart,
                            lte: extendedEnd,
                        }
                    },
                    {
                        // Bookings that span across our extended range
                        AND: [
                            {
                                start_date: {
                                    lte: extendedStart,
                                }
                            },
                            {
                                end_date: {
                                    gte: extendedEnd,
                                }
                            }
                        ]
                    }
                ]
            });

            console.log(rawBookings);
            
            // Add custom_id field to match BookingsIncludeAll type
            return rawBookings?.map(booking => ({
                ...booking,
                custom_id: `#${booking.id}`
            })) || [];
        }
    });

    useEffect(() => {
        // Set default value as all
        let newSet = new Set<number>();
        props.roomTypes.forEach((rt) => {
           newSet.add(rt.id);
        });
        setFilteredRoomTypeIDs(newSet);
    }, [props.roomTypes]);

    useEffect(() => {
        if (bookings && searchTriggered) {
            setRoomTypes(
                calculateRoomAvailability(props.roomTypes, bookings, dates)
            );
            setIsSearching(false);
        }
    }, [bookings, props.roomTypes, dates, searchTriggered]);

    const handleSearch = () => {
        if (dates?.from && dates?.to) {
            setSearchTriggered(true);
            setIsSearching(true);
            if (!isBookingsLoading) {
                refetchBookings();
            }
        } else {
            setIsPopoverOpen(true);
        }
    };

    const handleDateSelect = (d?: DateRange) => {
        if (d?.from) {
            // Allow single date selection
            const selectedRange = d.to ? d : { from: d.from, to: d.from };
            setDates(selectedRange);
        }

        if (d?.from && d?.to) {
            setIsPopoverOpen(false);
        }
    };

    return (
        <>
            <div className="flex flex-wrap md:flex-nowrap gap-4">
                <Menu
                    dismiss={{
                        itemPress: false,
                    }}
                >
                    <MenuHandler>
                        <Button
                            className={"basis-1/2 md:basis-auto md:flex-grow-0 !px-2 !md:px-4 flex-1 border-[#b0bec5] flex items-center justify-center gap-3"}
                            variant={"outlined"}
                        >
                            Tipe Kamar
                            <FaChevronDown/>
                        </Button>
                    </MenuHandler>
                    <MenuList>
                        <MenuItem key={"all-rt"} className="p-0">
                            <label
                                htmlFor={"all-rt"}
                                className="flex cursor-pointer items-center gap-2 p-2"
                            >
                                <Checkbox
                                    checked={filteredRoomTypeIDs.size == roomTypes.length}
                                    onChange={(e) => {
                                        let newSet = new Set<number>();
                                        if (e.target.checked) {
                                            roomTypes.forEach((rt) => {
                                                newSet.add(rt.id);
                                            });
                                        }
                                        setFilteredRoomTypeIDs(newSet);
                                    }}
                                    ripple={false}
                                    id={"all-rt"}
                                    containerProps={{className: "p-0"}}
                                    className="hover:before:content-none"/>
                                Semua Tipe
                            </label>
                        </MenuItem>
                        {roomTypes.map(rt => (
                            <MenuItem key={rt.id} className="p-0">
                                <label
                                    htmlFor={rt.id.toString()}
                                    className="flex cursor-pointer items-center gap-2 p-2"
                                >
                                    <Checkbox
                                        checked={filteredRoomTypeIDs.has(rt.id)}
                                        onChange={(e) => {
                                            let newSet: Set<number>;
                                            if (e.target.checked) {
                                                // @ts-expect-error js version regarding sets
                                                newSet = new Set([...filteredRoomTypeIDs, rt.id]);
                                            } else {
                                                filteredRoomTypeIDs.delete(rt.id);
                                                newSet = new Set(filteredRoomTypeIDs);
                                            }
                                            setFilteredRoomTypeIDs(newSet);
                                        }}
                                        ripple={false}
                                        id={rt.id.toString()}
                                        containerProps={{className: "p-0"}}
                                        className="hover:before:content-none"/>
                                    {rt.type}
                                </label>
                            </MenuItem>
                        ))}
                    </MenuList>
                </Menu>
                <Popover
                    open={popoverOpen}
                    handler={() => setIsPopoverOpen(p => !p)}
                    placement="bottom-end"
                >
                    <PopoverHandler>
                        <Input
                            ref={dateInputRef}
                            variant="outlined"
                            icon={<CiCalendarDate/>}
                            onChange={() => null}
                            value={(() => {
                                if (dates?.from) {
                                    if (dates?.to && dates.from.getTime() !== dates.to.getTime()) {
                                        return `${formatToDateTime(dates.from, false)} - ${formatToDateTime(dates.to, false)}`;
                                    }
                                    return formatToDateTime(dates.from, false);
                                }
                                return "";
                            })()}
                            placeholder="Pilih tanggal"
                            containerProps={{
                                className: "basis-1/2 md:basis-auto md:ml-auto !w-auto !md:min-w-[225px] !h-auto min-h-10"
                            }}
                            className={`relative !border-t-blue-gray-200 focus:!border-t-gray-900`}
                            labelProps={{
                                className: "before:content-none after:content-none",
                            }}/>
                    </PopoverHandler>
                    <PopoverContent className={"z-[99999]"}>
                        <DayPicker
                            captionLayout="dropdown"
                            mode="range"
                            fixedWeeks={true}
                            selected={dates}
                            onSelect={handleDateSelect}
                            min={1}
                            showOutsideDays
                            startMonth={new Date(today.getFullYear() - 5, today.getMonth())}
                            endMonth={new Date(today.getFullYear() + 5, today.getMonth())}
                            classNames={{
                                disabled: "rdp-disabled cursor-not-allowed",
                            }}/>
                    </PopoverContent>
                </Popover>
                <Button 
                    className={"basis-full md:basis-auto border-[#b0bec5] text-[#b0bec5] flex justify-center items-center gap-4"} 
                    variant={"outlined"}
                    onClick={handleSearch}
                    disabled={isSearching}
                >
                    {isSearching ? (
                        <AiOutlineLoading className="animate-spin"/>
                    ) : (
                        <CiSearch/>
                    )}
                    <span className={"md:hidden"}>
                        {isSearching ? "Mencari..." : "Cari"}
                    </span>
                </Button>
            </div>
            
            {(isSearching || isBookingsLoading) && (
                <div className="mt-4 text-center">
                    <Typography color="gray" className="flex items-center justify-center gap-2">
                        <AiOutlineLoading className="animate-spin"/>
                        Mencari ketersediaan kamar...
                    </Typography>
                </div>
            )}
            
            {searchTriggered && dates?.from && !isSearching && (
                <div className="mt-4 text-center">
                    <Typography color="blue-gray" className="text-sm">
                        Menampilkan ketersediaan untuk: {formatToDateTime(dates.from, false)}
                        {dates.to && dates.from.getTime() !== dates.to.getTime() && 
                            ` - ${formatToDateTime(dates.to, false)}`
                        }
                    </Typography>
                </div>
            )}
            
            <div className="mt-8">
                {(roomTypes.length == 0 || filteredRoomTypeIDs.size == 0) ?
                    <div className={"w-full flex gap-4 justify-center"}>
                        <div className={"w-1/2 min-w-[300px] text-center"}>
                            <RiErrorWarningLine color={"gray"} className={"w-14 h-14 mx-auto mb-4"}/>
                            <Typography color={"gray"}>
                                {roomTypes.length == 0 ?
                                    "Tidak ada kamar yang tersedia pada tanggal tersebut. Mohon pilih tanggal lain." :
                                    "Mohon pilih setidaknya satu tipe kamar."}
                            </Typography>
                        </div>
                    </div> : <></>}
                <div className={"grid grid-flow-row gap-4 grid-cols-[repeat(auto-fill,minmax(250px,1fr))]"}>
                    {roomTypes.map(rt => {
                        if (!filteredRoomTypeIDs.has(rt.id)) {
                            return <></>;
                        }

                        return (
                            <Card key={rt.id}
                                  className="col-span-1 max-w-[26rem] min-w-[250px] shadow-lg transition-all hover:scale-[1.02]">
                                <CardHeader floated={false} color="blue-gray">
                                    <div
                                        className="to-bg-black-10 absolute inset-0 h-full w-full bg-gradient-to-tr from-transparent via-transparent to-black/60 "/>
                                </CardHeader>
                                <CardBody>
                                    <div className="mb-3 flex items-center justify-between">
                                        <Typography variant="h5" color="blue-gray" className="font-medium">
                                            {rt.type}
                                        </Typography>
                                        <Chip
                                            color={bookings && searchTriggered ?
                                                (rt.roomLeft === 0 ? "red" : "green") :
                                                "blue-gray"}
                                            className="rounded-full"
                                            value={(() => {
                                                let str = '';
                                                if (bookings && searchTriggered) {
                                                    str += `${rt.roomLeft}/`;
                                                }
                                                str += rt._count.rooms;

                                                return str;
                                            })()}/>
                                    </div>
                                    <Typography color="gray">
                                        {rt.description}
                                    </Typography>
                                </CardBody>
                                <CardFooter className="pt-3 mt-auto">
                                    <Link
                                        href={searchTriggered && dates != undefined ?
                                            {
                                                pathname: "/bookings",
                                                query: {
                                                    action: "create",
                                                    location_id: props.locationID,
                                                    room_type_id: rt.id
                                                }
                                            } : {}}
                                    >
                                        <Button
                                            disabled={rt.roomLeft === 0 && searchTriggered}
                                            size="lg"
                                            fullWidth={true}
                                            onClick={() => {
                                                if (!searchTriggered) {
                                                    setIsPopoverOpen(true);
                                                    return;
                                                }
                                            }}
                                        >
                                            {!searchTriggered ?
                                                "Pilih Tanggal" :
                                                (
                                                    rt.roomLeft == 0 ?
                                                        "Habis" :
                                                        "Reservasi"
                                                )}
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
