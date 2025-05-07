"use client";

import {getLocations} from "@/app/_db/location";
import {Button, Menu, MenuHandler, MenuItem, MenuList} from "@material-tailwind/react";
import {Location as LocationModel} from "@prisma/client";
import styles from "./locationPicker.module.css";
import {useQuery} from "@tanstack/react-query";
import {FaCheck, FaChevronDown, FaLocationDot} from "react-icons/fa6";
import {useState} from "react";

export interface LocationPickerProps {
    locationID?: number,
    setLocationID: (locationID?: number) => void,
    type: "compact" | "full"
}

export default function LocationPicker(props: LocationPickerProps) {
    const {data, isSuccess, isLoading} = useQuery({
        queryKey: ['header.location'],
        queryFn: () => getLocations()
    });
    const [openMenu, setOpenMenu] = useState(false);

    let activeLocation: Partial<LocationModel> | undefined = data?.find(l => props.locationID && l.id == props.locationID);
    if (!activeLocation) activeLocation = {
        id: undefined,
        name: "All Locations"
    };

    return (
        <>
            {
                isSuccess &&
                <Menu open={openMenu} handler={setOpenMenu} placement="bottom-end">
                    <MenuHandler>
                        <Button type="button" variant="text" className={styles.button}>
                            {
                                props.type == "full" && <Location location={activeLocation}/>
                            }
                            {
                                props.type == "compact" && <FaLocationDot />
                            }
                            <FaChevronDown
                                strokeWidth={2.5}
                                className={`h-3.5 w-3.5 transition-transform ${
                                    openMenu ? "rotate-180" : ""
                                }`}
                            />
                        </Button>
                    </MenuHandler>
                    <MenuList className={"max-h-64"}>
                        <MenuItem
                            onClick={() => props.setLocationID(undefined)}
                            className={"flex gap-x-4"}
                        >
                            <div className={"w-4 flex items-center"}>
                                {
                                    props.locationID == undefined ?
                                        <FaCheck/> :
                                        ""
                                }
                            </div>

                            <Location location={{
                                id: undefined,
                                name: "All Locations"
                            }}/>
                        </MenuItem>

                        {
                            data
                                // .filter(e => e.id != props.locationID)
                                .map(l =>
                                    <MenuItem
                                        key={l.id}
                                        onClick={() => props.setLocationID(l.id)}
                                        className={"flex gap-x-4"}
                                    >
                                        <div className={"w-4 flex items-center"}>
                                            {
                                                activeLocation.id == l.id ?
                                                    <FaCheck/> :
                                                    ""
                                            }
                                        </div>
                                        <Location location={l}/>
                                    </MenuItem>
                                )
                        }
                    </MenuList>
                </Menu>
            }
        </>
    );
}

interface LocationProps {
    location?: Partial<LocationModel>
    onClick?: () => void
}

function Location({
                      location
                  }: LocationProps) {
    return (
        <div className={styles.locationContainer}>
            <span className={styles.locationName}>{location?.name}</span>
            <span className={styles.locationAddress}>{location?.address}</span>
        </div>
    );
}
