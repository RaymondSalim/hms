import React, {useEffect, useRef, useState} from "react";
import {SelectOption} from "@/app/_components/input/select";
import {Chip, Menu, MenuHandler, MenuItem, MenuList} from "@material-tailwind/react";
import {IoSearch} from "react-icons/io5";
import {delay} from "@/app/_lib/util";
import {FaTimes} from "react-icons/fa";

export type SmartSearchFilter = {
    column: string;
    key: string;
    value: string;
}

export interface SmartSearchInputProps {
    suggestions: SelectOption<string>[];
    onSubmit: (filter?: SmartSearchFilter[], global?: string) => void;
}

export default function SmartSearchInput({suggestions, onSubmit}: SmartSearchInputProps) {
    const [inputValue, setInputValue] = useState<string>("");
    const [open, setOpen] = useState(false);
    const [pills, setPills] = useState<SmartSearchFilter[]>([]);
    const [globalFilter, setGlobalFilter] = useState<string>("");

    const menuRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const pillsRef = useRef<HTMLDivElement>(null);

    const [formattedSuggestions, setFormattedSuggestions] = useState(suggestions.map(s => ({
        ...s,
        original_label: s.label,
        label: `Cari dengan ${s.label}`,
        requireInput: true
    })));

    useEffect(() => {
        if (open) {
            delay(50).then(() => inputRef.current?.focus());
        }
    }, [open]);

    useEffect(() => {
        delay(50).then(() => {
            pillsRef.current?.lastElementChild?.scrollIntoView({
                behavior: "smooth"
            });
        });
        handleSubmit();
    }, [pills]);

    useEffect(() => {
        handleSubmit();
    }, [globalFilter]);

    useEffect(() => {
        const separatorIndex = inputValue.indexOf(":");
        if (separatorIndex !== -1) return;
        setGlobalFilter(inputValue);
        handleSubmit();
    }, [inputValue]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        switch (event.key) {
            case "Enter": {
                event.preventDefault();

                const trimmedValue = inputValue.trim();
                if (trimmedValue.length == 0) {
                    delay(125).then(() => setOpen(false));
                    handleSubmit();
                }

                // Check if input matches column filter format (e.g., "Name: John Doe")
                const separatorIndex = trimmedValue.indexOf(":");
                if (separatorIndex !== -1) {
                    const key = trimmedValue.substring(0, separatorIndex).trim();
                    const value = trimmedValue.substring(separatorIndex + 1).trim();

                    const matchedFilter = formattedSuggestions.find(
                        s => s.value.toLowerCase() === key.toLowerCase()
                    );

                    if (matchedFilter && value.length > 0) {
                        // Create a pill for column-specific filtering
                        setPills([
                            ...pills,
                            {
                                column: matchedFilter.original_label,
                                key: matchedFilter.value,
                                value
                            }
                        ]);
                        setInputValue("");
                    } else {
                        setGlobalFilter(trimmedValue);
                    }
                }
                break;
            }

            case "Backspace": {
                const trimmedValue = inputValue.trim();
                if (trimmedValue.length == 0) {
                    setPills(p => p.slice(0, -1));
                }
                break;
            }
        }
    };

    const handleSubmit = () => {
        onSubmit(pills, globalFilter);
    };

    return (
        <Menu ref={menuRef} placement={"bottom-start"} open={open} handler={setOpen}>
            <MenuHandler>
                <div
                    className="flex-grow bg-white border rounded-lg flex items-center min-w-0 gap-x-2 px-4 py-2 focus-within:ring-2 focus-within:ring-opacity-5">
                    {/* Pills Display */}
                    <div
                        ref={pillsRef}
                        className="flex gap-x-2 overflow-x-auto no-scrollbar items-center"
                    >
                        {pills.map((pill, index) => (
                            <Chip
                                key={index}
                                value={`${pill.column}: ${pill.value}`}
                                size="sm"
                                className="h-8 flex items-center"
                                icon={
                                    <FaTimes
                                        className="cursor-pointer text-gray-600 h-4 w-4"
                                        onClick={() => setPills(pills.filter((_, i) => i !== index))}
                                    />
                                }
                            />
                        ))}
                    </div>

                    {/* Search Input */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onFocus={() => setOpen(true)}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="min-w-1/2 flex-grow text-black focus:outline-none"
                        placeholder="Search..."
                    />
                    <IoSearch className={"flex-shrink-0 text-gray-600"}/>
                </div>
            </MenuHandler>

            {/* Dropdown Suggestions */}
            <MenuList style={menuRef.current ? {width: menuRef.current.clientWidth} : undefined}>
                {formattedSuggestions.map(s => (
                    <MenuItem
                        disabled={pills.find(p => p.key == s.value) != undefined}
                        className="w-full"
                        key={s.label}
                        onClick={() => {
                            setInputValue(`${s.value}:`);
                            inputRef.current?.focus();
                        }}
                        onMouseEnter={(e) => e.preventDefault()}
                    >
                        {s.label}
                    </MenuItem>
                ))}
            </MenuList>
        </Menu>
    );
}
