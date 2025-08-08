"use client";

import React, {useEffect, useMemo, useState} from "react";
import {useCountries} from "use-react-countries";
import {Button, Input, InputProps, Menu, MenuHandler, MenuItem, MenuList,} from "@material-tailwind/react";
import {isValidPhoneNumber, parsePhoneNumber} from "libphonenumber-js";

export interface PhoneInputProps extends InputProps {
    phoneNumber?: string | null;

    setPhoneNumber(pn: string): void
}

export function PhoneInput(props: PhoneInputProps) {
    const [hasSetup, setHasSetup] = useState(false);
    const [number, setNumber] = useState("");

    const {countries} = useCountries();
    const sortedCountries = useMemo(() => {
        let tempArr = countries.sort((a, b) => a.name.localeCompare(b.name));

        let indoIndex = countries.findIndex(e => e.name === "Indonesia");
        if (indoIndex != -1) {

            tempArr.unshift(countries[indoIndex]);
            tempArr.splice(indoIndex + 1, 1);

            return tempArr;
        }

        return tempArr;
    }, [countries]);

    const [country, setCountry] = React.useState(0);
    const {name, flags, countryCallingCode} = sortedCountries[country];

    useEffect(() => {
        if (props.phoneNumber && isValidPhoneNumber(props.phoneNumber)) {
            let phoneNumber = parsePhoneNumber(props.phoneNumber);
            let countryIndex = sortedCountries.findIndex(c => {
                return c.isoCountryCode == phoneNumber.country;
            });
            setNumber(phoneNumber.nationalNumber);
            if (countryIndex != -1) {
                setCountry(countryIndex);
            }
        }
        setHasSetup(true);
    }, []);

    useEffect(() => {
        if (hasSetup) {
            props.setPhoneNumber(`${countryCallingCode}${number}`);
        }
    }, [number, countryCallingCode]);

    return (
        <div className="relative flex w-full">
            <Menu placement="bottom-start">
                <MenuHandler>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Button
                        ripple={false}
                        variant="text"
                        color="blue-gray"
                        className="flex h-10 items-center gap-2 rounded-r-none border border-r-0 border-blue-gray-200 bg-blue-gray-500/10 pl-3"
                    >
                        <img
                            src={flags?.svg}
                            alt={name}
                            className="h-4 w-4 rounded-full object-cover"
                        />
                        {countryCallingCode}
                    </Button>
                </MenuHandler>
                {/* @ts-expect-error weird react 19 types error */}
                <MenuList className="max-h-[20rem] max-w-[18rem] z-[10000]">
                    {sortedCountries.map(({name, flags, countryCallingCode}, index) => {
                        return (
                            // @ts-expect-error weird react 19 types error
                            <MenuItem
                                key={name}
                                value={name}
                                className="flex items-center gap-2"
                                onClick={() => setCountry(index)}
                            >
                                <img
                                    src={flags?.svg}
                                    alt={name}
                                    className="h-5 w-5 rounded-full object-cover"
                                />
                                {name} <span className="ml-auto">{countryCallingCode}</span>
                            </MenuItem>
                        );
                    })}
                </MenuList>
            </Menu>
            {/* @ts-expect-error weird react 19 types error */}
            <Input
                {...props}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className={`rounded-l-none ${props.className}`}
                ref={undefined}

            />
        </div>
    );
}
