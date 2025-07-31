"use client";

import React, {useRef, useState} from 'react';
import {Button, Input, Popover, PopoverContent, PopoverHandler} from "@material-tailwind/react";
import {CiCalendarDate, CiSearch} from "react-icons/ci";
import {DateRange, DayPicker} from "react-day-picker";
import {formatToDateTime} from "@/app/_lib/util";
import {AiOutlineLoading} from "react-icons/ai";
import "react-day-picker/style.css";

export interface DatePickerProps {
    mode?: "single" | "range";
    onUpdate: (data: { 
        range?: DateRange, 
        singleDate?: Date,
        searchTriggered: boolean 
    }) => void;
    placeholder?: string;
    showSearchButton?: boolean;
    searchButtonText?: string;
    disabled?: boolean;
    min?: number;
    max?: number;
    timeZone?: string;
    className?: string;
}

export function DatePicker({ 
    mode = "range", 
    onUpdate, 
    placeholder = "Pilih tanggal",
    showSearchButton = true,
    searchButtonText = "Cari",
    disabled = false,
    min,
    max,
    timeZone = "UTC",
    className
}: DatePickerProps) {
    const today = new Date();
    const [dates, setDates] = useState<DateRange | undefined>(undefined);
    const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
    const [popoverOpen, setIsPopoverOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = () => {
        if (mode === "range" && dates?.from) {
            setIsSearching(true);
            onUpdate({ range: dates, searchTriggered: true });
            setTimeout(() => setIsSearching(false), 1000);
        } else if (mode === "single" && singleDate) {
            setIsSearching(true);
            onUpdate({ singleDate, searchTriggered: true });
            setTimeout(() => setIsSearching(false), 1000);
        } else {
            setIsPopoverOpen(true);
        }
    };

    const handleDateSelect = (d?: DateRange | Date) => {
        if (mode === "range") {
            const range = d as DateRange;
            if (range?.from) {
                // For range mode, we want to allow partial selection
                // Only set the range when both from and to are selected
                if (range.to) {
                    setDates(range);
                } else {
                    // Keep the partial selection (just from date)
                    setDates({ from: range.from });
                }
            }
        } else {
            const date = d as Date;
            if (date) {
                setSingleDate(date);
            }
        }
    };

    const handleClear = () => {
        if (mode === "range") {
            setDates(undefined);
        } else {
            setSingleDate(undefined);
        }
    };

    const handleConfirm = () => {
        if (mode === "range" && dates?.from) {
            setIsPopoverOpen(false);
            setIsSearching(true);
            onUpdate({ range: dates, searchTriggered: true });
            setTimeout(() => setIsSearching(false), 1000);
        } else if (mode === "single" && singleDate) {
            setIsPopoverOpen(false);
            setIsSearching(true);
            onUpdate({ singleDate, searchTriggered: true });
            setTimeout(() => setIsSearching(false), 1000);
        }
    };

    const getDisplayValue = () => {
        if (mode === "range") {
            if (dates?.from) {
                if (dates?.to && dates.from.getTime() !== dates.to.getTime()) {
                    return `${formatToDateTime(dates.from, false)} - ${formatToDateTime(dates.to, false)}`;
                }
                // Show just the start date when only one date is selected
                return formatToDateTime(dates.from, false);
            }
        } else {
            if (singleDate) {
                return formatToDateTime(singleDate, false);
            }
        }
        return "";
    };

    const isConfirmDisabled = () => {
        if (mode === "range") {
            return !dates?.from;
        } else {
            return !singleDate;
        }
    };
    
    return (
        <div className={`flex flex-wrap md:flex-nowrap gap-4 ${className || ''}`}>
            <Popover
                open={popoverOpen}
                handler={() => setIsPopoverOpen(p => !p)}
                placement="bottom-end"
            >
                <PopoverHandler>
                    <Input
                        variant="outlined"
                        icon={<CiCalendarDate/>}
                        onChange={() => null}
                        value={getDisplayValue()}
                        placeholder={placeholder}
                        disabled={disabled}
                        containerProps={{
                            className: "basis-1/2 md:basis-auto md:ml-auto !w-full !md:min-w-[225px] !h-auto min-h-10"
                        }}
                        className={`relative !border-t-blue-gray-200 focus:!border-t-gray-900`}
                        labelProps={{
                            className: "before:content-none after:content-none",
                        }}/>
                </PopoverHandler>
                <PopoverContent className={"z-[99999] p-0"}>
                    <div className="p-3">
                        <DayPicker
                            timeZone={timeZone}
                            captionLayout="dropdown"
                            mode={mode}
                            fixedWeeks={true}
                            selected={mode === "range" ? dates : singleDate}
                            onSelect={handleDateSelect}
                            {...(min !== undefined && { min })}
                            {...(max !== undefined && { max })}
                            showOutsideDays
                            startMonth={new Date(today.getFullYear() - 5, today.getMonth())}
                            endMonth={new Date(today.getFullYear() + 5, today.getMonth())}
                            classNames={{
                                disabled: "rdp-disabled cursor-not-allowed",
                                // root: "w-full !ml-0"
                            }}/>
                    </div>
                    <div className="flex gap-2 p-3 border-t border-gray-200">
                        <Button
                            variant="outlined"
                            size="sm"
                            onClick={handleClear}
                            className="flex-1"
                            disabled={mode === "range" ? !dates?.from : !singleDate}
                        >
                            Bersihkan
                        </Button>
                        <Button
                            variant="filled"
                            size="sm"
                            onClick={handleConfirm}
                            className="flex-1"
                            disabled={isConfirmDisabled()}
                        >
                            Konfirmasi
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
            {showSearchButton && (
                <Button 
                    className={"basis-full md:basis-auto border-[#b0bec5] text-[#b0bec5] flex justify-center items-center gap-4"} 
                    variant={"outlined"}
                    onClick={handleSearch}
                    disabled={isSearching || disabled}
                >
                    {isSearching ? (
                        <AiOutlineLoading className="animate-spin"/>
                    ) : (
                        <CiSearch/>
                    )}
                    <span className={"md:hidden"}>
                        {isSearching ? "Mencari..." : searchButtonText}
                    </span>
                </Button>
            )}
        </div>
    );
}

// Keep the old DateRangePicker for backward compatibility
export interface DateRangePickerProps {
    onUpdate: (data: { range: DateRange, searchTriggered: boolean }) => void;
}

export function DateRangePicker({ onUpdate }: DateRangePickerProps) {
    return (
        <DatePicker
            mode="range"
            onUpdate={(data) => onUpdate({ range: data.range!, searchTriggered: data.searchTriggered })}
        />
    );
} 