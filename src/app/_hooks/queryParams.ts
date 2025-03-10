import {useEffect, useState} from "react";
import {useSearchParams} from "next/navigation";

export function useQueryParams<T extends Record<string, any>>(defaultValues?: Partial<T>) {
    const searchParams = useSearchParams();
    const [queryParams, setQueryParams] = useState<T>({ ...defaultValues } as T);

    useEffect(() => {
        let updatedParams: Partial<T> = { ...defaultValues } as T;
        let shouldUpdate = false;

        searchParams.forEach((value, key) => {
            if (value && !isNaN(Number(value))) {
                updatedParams[key as keyof T] = Number(value) as T[keyof T]; // Convert to number if possible
            } else {
                updatedParams[key as keyof T] = value as T[keyof T]; // Keep as string if not a number
            }
            shouldUpdate = true;
        });

        if (shouldUpdate) {
            setQueryParams(updatedParams as T);
        }
    }, [searchParams]);

    return queryParams;
}
