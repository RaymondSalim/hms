import React, {useEffect, useState} from "react";
import {Input, InputProps} from "@material-tailwind/react";

export type CurrencyInputProps = {
    setValue: ((newValue: number | undefined) => void);
} & InputProps & React.RefAttributes<HTMLInputElement>;

export default function CurrencyInput({setValue, ...props}: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState(formatCurrency(props.value));

    useEffect(() => {
        setDisplayValue(formatCurrency(props.value));
    }, [props.value]);

    function formatCurrency(value: string | number | readonly string[] | undefined): string {
        // Ensure the value is a valid number or convert it
        const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, "")) :
            typeof value === 'number' ? value : NaN;
        if (isNaN(numericValue)) return '';  // Return an empty string if the value isn't a valid number
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,

        }).format(numericValue);
    }

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const rawValue = event.target.value;

        const valueWithoutSymbols = rawValue.replace(/[^0-9,]/g, "");
        const valueToParse = valueWithoutSymbols.replace(",", ".");

        // If there's no valid number (empty input or only symbols), reset the value to 0 or empty string
        if (valueWithoutSymbols === "") {
            setDisplayValue("");
            setValue(undefined);
            return;
        }

        setDisplayValue(rawValue);

        const parsedValue = parseFloat(valueToParse);

        if (!isNaN(parsedValue)) {
            setValue(parsedValue); // Update the actual numeric value
        } else {
            setValue(undefined);
        }
    }

    return (
        <Input
            {...props}
            value={displayValue}
            onChange={handleChange}
            type="text"
        />
    );
}
