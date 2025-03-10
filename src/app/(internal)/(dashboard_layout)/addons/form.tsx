"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import React, {useEffect, useMemo, useState} from "react";
import {
    Accordion,
    AccordionBody,
    AccordionHeader,
    Button,
    Card,
    CardBody,
    Checkbox,
    Input,
    Typography
} from "@material-tailwind/react";
import {useQuery} from "@tanstack/react-query";
import {SelectComponent, SelectOption} from "@/app/_components/input/select";
import {getLocations} from "@/app/_db/location";
import {AddOnPricing} from "@prisma/client";
import {ZodFormattedError} from "zod";
import "react-day-picker/style.css";
import {AnimatePresence, MotionConfig} from "framer-motion";
import CurrencyInput from "@/app/_components/input/currencyInput";
import {AddonIncludePricing} from "@/app/(internal)/(dashboard_layout)/addons/addons-action";
import {FaAngleDown} from "react-icons/fa6";

interface AddonFormProps extends TableFormProps<AddonIncludePricing> {
}

export function AddonForm(props: AddonFormProps) {
    const [addonData, setAddonData] = useState<Partial<AddonIncludePricing>>(props.contentData ?? {});
    const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<AddonIncludePricing> | undefined>(props.mutationResponse?.errors);

    const [showPricingSimulation, setShowPricingSimulation] = useState(false);

    const [initialData, setInitialData] = useState<Partial<typeof props.contentData>>(props.contentData ?? {});
    // Function to compare initial and current booking data
    const hasChanges = (initialData: Partial<typeof props.contentData>, currentData: Partial<typeof props.contentData>) => {
        return JSON.stringify(initialData) !== JSON.stringify(currentData);
    };

    // Separate state for pricing
    const [pricingData, setPricingData] = useState<Partial<AddOnPricing>[]>(
        props.contentData?.pricing?.length ? [...props.contentData.pricing] : [{
            price: 0,
            interval_start: 0,
            interval_end: null
        }]
    );

    const isButtonDisabled = useMemo(() => {
        console.log(addonData);
        return !addonData?.name ||
            !addonData?.location_id;/* ||*/
        // !addonData.pricing?.[0]?.price ||
        // !addonData.pricing?.[0]?.interval_start;
    }, [addonData]);

    // Location Data
    const {data: locationData, isSuccess: locationDataSuccess} = useQuery({
        queryKey: ['header.location'],
        queryFn: () => getLocations(),
    });
    const [locationDataMapped, setLocationDataMapped] = useState<SelectOption<number>[]>([]);
    useEffect(() => {
        if (locationDataSuccess) {
            setLocationDataMapped(locationData.map(e => ({
                value: e.id,
                label: `${e.name}`,
            })));
        }
    }, [locationData, locationDataSuccess]);


    const addPricingEntry = () => {
        setPricingData((prev) => [...prev, {
            price: 0,
            interval_start: (prev[Math.max(prev.length - 1, 0)]?.interval_end ?? -1) + 1,
            interval_end: null
        }]);
    };

    const updatePricingEntry = (index: number, key: keyof typeof pricingData[0], value: any) => {
        setPricingData((prev) =>
            prev.map((entry, i) => (i === index ? {...entry, [key]: value} : entry))
        );
    };

    const removePricingEntry = (index: number) => {
        if (pricingData.length > 1) {
            setPricingData((prev) => {
                let filtered = prev.filter((_, i) => i !== index);

                // set the first pricing data's start to zero
                filtered[0].interval_start = 0;
                return filtered;
            });
        }
    };

    // Use effect to set initial data when the component mounts
    useEffect(() => {
        setInitialData(props.contentData ?? {});
        setPricingData(props.contentData?.pricing || [{price: 0, interval_start: 0, interval_end: null}]);

    }, [props.contentData]);

    useEffect(() => {
        setFieldErrors(props.mutationResponse?.errors);
    }, [props.mutationResponse?.errors]);

    // Update `addonData` whenever pricing changes
    useEffect(() => {
        // @ts-expect-error pricing id type
        setAddonData((prev) => ({...prev, pricing: pricingData}));
    }, [pricingData]);

    return (
        <div className={"w-full px-8 py-4"}>
            <h1 className={"text-xl font-semibold text-black"}>{props.contentData && !props.fromQuery ? "Perubahan" : "Pembuatan"} Layanan
                Tambahan</h1>
            <form className={"mt-4"}>
                <div className="mb-1 flex flex-col gap-6">
                    <MotionConfig
                        transition={{duration: 0.5}}
                    >
                        <AnimatePresence key={"addon_form"}>
                            <div key={"name"}>
                                <label htmlFor="name">
                                    <Typography variant="h6" color="blue-gray">
                                        Nama
                                    </Typography>
                                </label>
                                <Input
                                    variant="outlined"
                                    name="name"
                                    value={addonData.name}
                                    onChange={(e) => setAddonData(prev => ({...prev, name: e.target.value}))}
                                    size="lg"
                                    placeholder="Kulkas"
                                    error={!!fieldErrors?.name}
                                    className={`${!!fieldErrors?.name ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                    labelProps={{
                                        className: "before:content-none after:content-none",
                                    }}
                                />
                                {
                                    fieldErrors?.name &&
                                    <Typography color="red">{fieldErrors?.name._errors}</Typography>
                                }
                            </div>
                            <div key={"location"}>
                                <label htmlFor="location">
                                    <Typography variant="h6" color="blue-gray">
                                        Lokasi
                                    </Typography>
                                </label>
                                <SelectComponent<number>
                                    setValue={(v) => setAddonData(p => ({...p, location_id: v}))}
                                    options={locationDataMapped}
                                    selectedOption={
                                        locationDataMapped.find(r => r.value == addonData.location_id)
                                    }
                                    placeholder={"Masukan Lokasi"}
                                    isError={false}
                                />
                            </div>
                            <div key={"description"}>
                                <label htmlFor="description">
                                    <Typography variant="h6" color="blue-gray">
                                        Deskripsi
                                    </Typography>
                                </label>
                                <Input
                                    variant="outlined"
                                    name="description"
                                    value={addonData.description ?? ""}
                                    onChange={(e) => setAddonData(prev => ({
                                        ...prev,
                                        description: e.target.value
                                    }))}
                                    size="lg"
                                    error={!!fieldErrors?.description}
                                    className={`${!!fieldErrors?.description ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                    labelProps={{
                                        className: "before:content-none after:content-none",
                                    }}
                                />
                                {
                                    fieldErrors?.description &&
                                    <Typography color="red">{fieldErrors?.description._errors}</Typography>
                                }
                            </div>
                            <div key={"pricings"}>
                                <Typography variant="h6" color="blue-gray">
                                    Harga
                                </Typography>
                                {pricingData.map((pricing, index, arr) => (
                                    <Card key={index} className="shadow-md mt-2">
                                        <CardBody>
                                            <div className="flex flex-col gap-4 items-center *:w-full">
                                                <div>
                                                    <Typography>Harga:</Typography>
                                                    <CurrencyInput
                                                        error={!!fieldErrors?.pricing?.[index]?.price}
                                                        className={`${!!fieldErrors?.pricing?.[index]?.price ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                                        labelProps={{
                                                            className: "before:content-none after:content-none",
                                                        }}
                                                        value={pricing.price || 0}
                                                        setValue={(value) => updatePricingEntry(index, "price", value)}
                                                    />
                                                    {
                                                        fieldErrors?.pricing?.[index]?.price &&
                                                        <Typography
                                                            color="red">{fieldErrors?.pricing?.[index]?.price?._errors}</Typography>
                                                    }
                                                </div>
                                                <div>
                                                    <Typography variant={"h6"}>Jangka Waktu</Typography>
                                                    <div>
                                                        <Typography>Mulai:</Typography>
                                                        <Input
                                                            error={!!fieldErrors?.pricing?.[index]?.interval_start}
                                                            className={`${!!fieldErrors?.pricing?.[index]?.interval_start ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                                            labelProps={{
                                                                className: "before:content-none after:content-none",
                                                            }}
                                                            type="number"
                                                            disabled={index == 0}
                                                            value={pricing.interval_start || 0}
                                                            onChange={(e) => updatePricingEntry(index, "interval_start", parseInt(e.target.value))}
                                                        />
                                                        {
                                                            fieldErrors?.pricing?.[index]?.interval_start &&
                                                            <Typography
                                                                color="red">{fieldErrors?.pricing?.[index]?.interval_start?._errors}</Typography>
                                                        }
                                                    </div>
                                                    <div className={"mt-4"}>
                                                        <Typography>Selesai:</Typography>
                                                        <Input
                                                            error={!!fieldErrors?.pricing?.[index]?.interval_end}
                                                            required={index != arr.length - 1}
                                                            type="number"
                                                            className={`${!!fieldErrors?.pricing?.[index]?.interval_end ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                                            labelProps={{
                                                                className: "before:content-none after:content-none",
                                                            }}
                                                            value={pricing.interval_end || ""}
                                                            onChange={(e) => updatePricingEntry(index, "interval_end", parseInt(e.target.value) || null)}
                                                        />
                                                        <p className="text-xs mt-2">
                                                            Biarkan kosong jika selamanya.
                                                        </p>
                                                        <Checkbox
                                                            label={
                                                                <Typography color="blue-gray" className="font-medium">
                                                                    Pembayaran Penuh di Awal
                                                                </Typography>
                                                            }
                                                            checked={pricing.is_full_payment}
                                                            onChange={(e) => updatePricingEntry(index, "is_full_payment", e.target.checked)}
                                                            containerProps={{
                                                                className: "-ml-3",
                                                            }}
                                                        />
                                                        {
                                                            fieldErrors?.pricing?.[index]?.interval_end &&
                                                            <Typography
                                                                color="red">{fieldErrors?.pricing?.[index]?.interval_end?._errors}</Typography>
                                                        }
                                                    </div>
                                                </div>

                                                {/* Remove Pricing */}
                                                <Button
                                                    color="red"
                                                    variant="outlined"
                                                    onClick={() => removePricingEntry(index)}
                                                    disabled={pricingData.length === 1} // Prevent removing the last pricing entry
                                                >
                                                    Hapus
                                                </Button>
                                            </div>
                                        </CardBody>
                                    </Card>
                                ))}
                                <Button color="green" onClick={addPricingEntry}
                                        className="mt-4 w-full flex gap-x-3 items-center justify-center">
                                    <span className={"leading-loose"}>
                                         Tambah Harga
                                    </span>
                                </Button>
                                <Accordion
                                    icon={<FaAngleDown className={`transition-all ${showPricingSimulation ? 'rotate-180' : 'rotate-0'}`} />}
                                    open={showPricingSimulation}
                                >
                                    <AccordionHeader onClick={() => setShowPricingSimulation(o => !o)}>
                                        <Typography variant={"h6"}>Simulasi Tanggal</Typography>
                                    </AccordionHeader>
                                    <AccordionBody>
                                        {simulateAddonPricing(pricingData)}
                                    </AccordionBody>
                                </Accordion>
                            </div>
                            {
                                props.mutationResponse?.failure &&
                                <Typography key={"failure message"} variant="h6" color="red" className="-mb-4">
                                    {props.mutationResponse.failure}
                                </Typography>
                            }
                        </AnimatePresence>
                    </MotionConfig>
                </div>

                <div className={"flex gap-x-4 justify-end"}>
                    <Button onClick={() => props.setDialogOpen(false)} variant={"outlined"} className="mt-6">
                        Batal
                    </Button>
                    <Button disabled={isButtonDisabled || !hasChanges(initialData, addonData)}
                            onClick={() => props.mutation.mutate(addonData)}
                            color={"blue"} className="mt-6"
                            loading={props.mutation.isPending}>
                        {props.contentData && !props.fromQuery ? "Ubah" : "Buat"}
                    </Button>
                </div>
            </form>
        </div>
    )
        ;
}

function simulateAddonPricing(pricingData: Partial<AddOnPricing>[], maxMonths = 6): JSX.Element {
    if (!pricingData || pricingData.length === 0) {
        return (
            <Typography color="red">
                Data harga tidak tersedia untuk simulasi.
            </Typography>
        );
    }

    const simulation: { monthYear: string; price: number; }[] = [];
    const currentYear = new Date().getFullYear(); // Example year for simulation
    let maxEndMonth = 0;

    // Generate simulation data for all pricing intervals
    pricingData.forEach((pricing) => {
        if (!pricing.price || pricing.interval_start === undefined) {
            return;
        }

        const startMonth = pricing.interval_start;
        const endMonth = pricing.interval_end ?? startMonth + maxMonths - 1; // Limit to maxMonths if no end
        const isFullPayment = pricing.is_full_payment;

        let currentMonth = startMonth;
        while (currentMonth <= endMonth) {
            const monthDate = new Date(currentYear, currentMonth - 1); // JavaScript months are 0-based
            const monthYear = monthDate.toLocaleString("default", { month: "short", year: "numeric" });

            if (isFullPayment && currentMonth !== startMonth) {
                simulation.push({
                    monthYear,
                    price: 0,
                });
            } else {
                simulation.push({
                    monthYear,
                    price: pricing.price,
                });
            }

            currentMonth++;
            maxEndMonth = Math.max(maxEndMonth, currentMonth);
        }

        // Add ellipsis row for open-ended pricing
        if (pricing.interval_end === null) {
            simulation.push({
                monthYear: "...",
                price: pricing.price,
            });
        }
    });

    return (
        <div className="">
            <div className="overflow-x-auto">
                <table className="table-auto border-collapse border border-gray-400 w-full mt-4">
                    <thead>
                    <tr>
                        <th className="border border-gray-300 px-4 py-2">Bulan</th>
                        <th className="border border-gray-300 px-4 py-2">Harga</th>
                    </tr>
                    </thead>
                    <tbody>
                    {simulation.map((entry, index) => (
                        <tr key={index}>
                            <td className="border border-gray-300 px-4 py-2">
                                {entry.monthYear}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                                {entry.price.toLocaleString("id-ID", {
                                    style: "currency",
                                    currency: "IDR",
                                })}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function simulateSinglePricing(pricing: Partial<AddOnPricing>, maxMonths = 6): JSX.Element {
    if (!pricing.price || pricing.interval_start === undefined) {
        return (
            <Typography color="red">
                Data harga tidak lengkap untuk simulasi.
            </Typography>
        );
    }

    const simulation = [];
    const startMonth = pricing.interval_start;
    const endMonth = pricing.interval_end ?? startMonth + maxMonths - 1; // Limit to maxMonths if no end
    const isFullPayment = pricing.is_full_payment;

    let currentMonth = startMonth;
    const currentYear = new Date().getFullYear(); // Example year for simulation

    while (currentMonth <= endMonth) {
        const monthDate = new Date(currentYear, currentMonth - 1); // JavaScript months are 0-based
        const monthYear = monthDate.toLocaleString("default", { month: "short", year: "numeric" });

        if (isFullPayment && currentMonth != startMonth) {
            simulation.push({
                monthYear,
                price: 0,
            });
        } else {
            simulation.push({
                monthYear,
                price: pricing.price,
            });
        }


        currentMonth++;
    }

    // If interval_end is null, add an ellipsis row
    if (pricing.interval_end === null) {
        simulation.push({
            monthYear: "...",
            price: pricing.price,
        });
        simulation.push({
            monthYear: "...",
            price: pricing.price,
        });
    } else {
        // Add two extra rows with no charges
        for (let i = 0; i < 2; i++) {
            const monthDate = new Date(currentYear, currentMonth - 1); // JavaScript months are 0-based
            const monthYear = monthDate.toLocaleString("default", { month: "short", year: "numeric" });

            simulation.push({
                monthYear,
                price: 0,
            });

            currentMonth++;
        }
    }

    return (
        <div className="">
            <div className="overflow-x-auto">
                <table className="table-auto border-collapse border border-gray-400 w-full mt-4">
                    <thead>
                    <tr>
                        <th className="border border-gray-300 px-4 py-2">Bulan</th>
                        <th className="border border-gray-300 px-4 py-2">Harga</th>
                    </tr>
                    </thead>
                    <tbody>
                    {simulation.map((entry, index) => (
                        <tr key={index}>
                            <td className="border border-gray-300 px-4 py-2">
                                {entry.monthYear}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                                {entry.price.toLocaleString("id-ID", {
                                    style: "currency",
                                    currency: "IDR",
                                })}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
