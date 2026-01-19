import React, {useEffect, useState} from "react";
import Select, {StylesConfig} from "react-select";
import CreatableSelect from "react-select/creatable";

export type SelectOption<T> = {
    value: T,
    label: string,
    isDisabled?: boolean
    color?: string; // Optional color field
    [key: string]: any
}

export type SelectProps<T> = {
    type?: "select" | "creatable";
    setValue: (value?: T) => void;

    selectedOption?: SelectOption<T>,
    options: SelectOption<T>[]

    filterFn?: (o: SelectOption<T>) => boolean

    placeholder: string
    isError: boolean
    isDisabled?: boolean
    isSearchable?: boolean
    formatOptionLabel?: (data: SelectOption<T>) => React.ReactNode;
    styles?: StylesConfig<SelectOption<T>>;
    className?: string
};

export function SelectComponent<T = string>({type = "select", ...props}: SelectProps<T>) {
    const [value, setValue] = useState<SelectOption<T> | undefined>(undefined);
    const [options, setOptions] = useState<SelectOption<T>[]>(props.options);
    const [isError, setIsError] = useState(false);
    const [isDisabled, setIsDisabled] = useState(props.isDisabled ?? false);

    const loadOptions = (
        inputValue: string,
        callback: (options: SelectOption<T>[]) => void
    ) => {
        if (inputValue.length <= 2) {
            callback(options);
            return;
        }

        let filtered = options?.filter(props.filterFn ?? ((o) => {
            if (typeof o.value == "string") {
                return o.value.toLowerCase() == inputValue.toLowerCase();
            } else {
                return o.value == parseInt(inputValue, 10);
            }
        }));

        callback(filtered);
    };

    useEffect(() => {
        setValue(props.selectedOption);
    }, [props.selectedOption]);

    useEffect(() => {
        setOptions(props.options);
    }, [props.options]);

    useEffect(() => {
        setIsError(props.isError);
    }, [props.isError]);

    useEffect(() => {
        setIsDisabled(props.isDisabled ?? false);
    }, [props.isDisabled]);

    const Component = type == "select" ? (Select) : (CreatableSelect);

    return (
        <Component
            className={props.className}
            menuPosition={"fixed"}
            onChange={(n: SelectOption<T> | null) => {
                setValue(n ?? undefined);
                props.setValue(n?.value ?? undefined);
            }}
            isMulti={false}
            isClearable={true}
            isSearchable={props.isSearchable}
            options={options}
            isDisabled={isDisabled}
            isOptionDisabled={(o) => o.isDisabled ?? false}
            // cacheOptions
            // defaultOptions={options}
            // loadOptions={loadOptions}
            value={value}
            placeholder={props.placeholder}
            classNames={{
                control: (state) => {
                    return isError ? "!border-red-500" : "";
                }
            }}
            formatOptionLabel={props.formatOptionLabel}
            styles={{
                placeholder: (base) => ({
                    ...base,
                    marginLeft: '8px'
                }),
            }}
            formatCreateLabel={(s) => `Buat "${s}"`}
            noOptionsMessage={(s) => `Tidak Ada Pilihan ${s.inputValue.length > 0 ? `"${s.inputValue}"` : ""}`}
        />
    );
}
