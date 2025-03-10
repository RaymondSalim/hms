import {RoomTypeWithRoomCount} from "@/app/_db/room";
import React, {Dispatch, SetStateAction, useEffect, useRef, useState} from "react";
import {
    Button,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    Checkbox,
    Chip,
    IconButton,
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

export interface RoomAvailabilityProps {
    roomTypes: RoomTypeWithRoomCount[]
    bookings?: BookingsIncludeAll[]
    locationID?: number

    dateState: [DateRange | undefined, Dispatch<SetStateAction<DateRange | undefined>>]
}

type RoomTypeWithRoomCountAndAvailability = RoomTypeWithRoomCount & {
    roomLeft?: number,
}

export function calculateRoomAvailability(
    roomTypes: RoomTypeWithRoomCount[],
    bookings?: BookingsIncludeAll[]
): RoomTypeWithRoomCountAndAvailability[] {
    return roomTypes.map((rt) => {
        const totalRooms = rt._count.rooms;

        // Calculate the number of rooms booked for the current room type
        const roomsBooked = bookings?.reduce((count, booking) => {
            if (booking.rooms?.room_type_id === rt.id) {
                return count + 1;
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

// TODO! Change into input single date, and duration
export default function RoomAvailabilityContent(props: RoomAvailabilityProps) {
    const today = new Date();

    const [dates, setDates] = props.dateState;
    const [roomTypes, setRoomTypes] = useState<RoomTypeWithRoomCountAndAvailability[]>(props.roomTypes);
    const [popoverOpen, setIsPopoverOpen] = useState(false);

    const [filteredRoomTypeIDs, setFilteredRoomTypeIDs] = useState<Set<number>>(new Set());

    const dateInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Set default value as all
        let newSet = new Set<number>();
        props.roomTypes.forEach((rt) => {
           newSet.add(rt.id);
        });
        setFilteredRoomTypeIDs(newSet);
    }, []);

    useEffect(() => {
        if (props.bookings) {
            setRoomTypes(
                calculateRoomAvailability(props.roomTypes, props.bookings)
            );
        }
    }, [props]);

    return (
        <>
            <div className="p-8 flex gap-x-4">
                <Menu
                    dismiss={{
                        itemPress: false,
                    }}
                >
                    <MenuHandler>
                        <Button
                            className={"mr-auto border-[#b0bec5] flex items-center gap-3"}
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
                                if (dates?.from && dates?.to) {
                                    return `${formatToDateTime(dates.from, false)} - ${formatToDateTime(dates.to, false)}`;
                                }

                                return undefined;
                            })()}
                            containerProps={{
                                className: "!w-auto !min-w-[225px]"
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
                            onSelect={(d?: DateRange) => {
                                if (d?.from && d?.to) {
                                    setIsPopoverOpen(false);
                                    setDates(d);
                                }
                            }}
                            min={1}
                            showOutsideDays
                            startMonth={new Date(today.getFullYear() - 5, today.getMonth())}
                            endMonth={new Date(today.getFullYear() + 5, today.getMonth())}
                            classNames={{
                                disabled: "rdp-disabled cursor-not-allowed",
                            }}/>
                    </PopoverContent>
                </Popover>
                <IconButton className={"border-[#b0bec5]"} variant={"outlined"}>
                    <CiSearch/>
                </IconButton>
            </div>
            <div className="mt-8">
                {(roomTypes.length == 0 || filteredRoomTypeIDs.size == 0) ?
                    <div className={"w-full flex gap-4 justify-center"}>
                        <div className={"w-1/2 min-w-[300px] text-center"}>
                            <RiErrorWarningLine color={"gray"} className={"w-14 h-14 mx-auto mb-4"}/>
                            <Typography color={"gray"}>
                                {roomTypes.length == 0 ?
                                    "Tidak ada kamar yang tersedia pada tangga tersebut. Mohon pilih tanggal lain." :
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
                                    <img
                                        src="https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"
                                        alt="ui/ux review check" /*!TODO REPLACE*/ />
                                    <div
                                        className="to-bg-black-10 absolute inset-0 h-full w-full bg-gradient-to-tr from-transparent via-transparent to-black/60 "/>
                                </CardHeader>
                                <CardBody>
                                    <div className="mb-3 flex items-center justify-between">
                                        <Typography variant="h5" color="blue-gray" className="font-medium">
                                            {rt.type}
                                        </Typography>
                                        <Chip
                                            color={props.bookings ?
                                                (rt.roomLeft === 0 ? "red" : "green") :
                                                "blue-gray"}
                                            className="rounded-full"
                                            value={(() => {
                                                let str = '';
                                                if (props.bookings) {
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
                                        href={dates != undefined ?
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
                                            disabled={rt.roomLeft === 0}
                                            size="lg"
                                            fullWidth={true}
                                            onClick={() => {
                                                if (dates == undefined) {
                                                    setIsPopoverOpen(true);
                                                    return;
                                                }
                                            }}
                                        >
                                            {dates == undefined ?
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
