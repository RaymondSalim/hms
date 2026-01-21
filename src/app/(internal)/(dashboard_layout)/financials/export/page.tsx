"use client";

import React, {useEffect, useState} from "react";
import Link from "next/link";
import {Button, Checkbox, Typography} from "@material-tailwind/react";
import {DateRange} from "react-day-picker";
import {DatePicker} from "@/app/_components/DateRangePicker";
import {useHeader} from "@/app/_context/HeaderContext";
import {useQuery} from "@tanstack/react-query";
import {getLocationsAction} from "@/app/(internal)/(dashboard_layout)/data-center/locations/location-action";
import {SelectComponent, SelectOption} from "@/app/_components/input/select";

export default function FinancialExportPage() {
    const headerContext = useHeader();

    useEffect(() => {
        headerContext.setTitle("Export Transaksi");
        headerContext.setShowLocationPicker(true);
        headerContext.setPaths([
            <Link key={"financials"} href={"/financials"}>Keuangan</Link>,
            <Link key={"export"} href={"/financials/export"}>Export Transaksi</Link>,
        ]);
    }, []);

    // Location Data
    const {data: locationData, isSuccess: locationDataSuccess} = useQuery({
        queryKey: ['header.location'],
        queryFn: () => getLocationsAction(),
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

    const [exportRange, setExportRange] = useState<DateRange | undefined>(undefined);
    const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("excel");
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);
    const [exportLocationId, setExportLocationId] = useState<number | undefined>(undefined);
    const [allTime, setAllTime] = useState(false);
    const formatOptions: SelectOption<"pdf" | "excel">[] = [
        {value: "excel", label: "Excel (.xlsx)"},
        {value: "pdf", label: "PDF"},
    ];

    const handleExport = async () => {
        setExportError(null);
        setIsExporting(true);
        try {
            const params = new URLSearchParams();
            params.set("format", exportFormat);

            if (!exportLocationId) {
                setExportError("Lokasi wajib dipilih.");
                setIsExporting(false);
                return;
            }
            params.set("locationId", exportLocationId.toString());

            if (!allTime) {
                if (exportRange?.from) {
                    params.set("startDate", exportRange.from.toISOString());
                }

                const endDate = exportRange?.to ?? exportRange?.from;
                if (endDate) {
                    params.set("endDate", endDate.toISOString());
                }
            }

            const res = await fetch(`/api/financials/transactions/export?${params.toString()}`);

            if (!res.ok) {
                const body = await res.json().catch(() => undefined);
                const message = body?.message ?? "Gagal mengekspor transaksi.";
                setExportError(message);
                return;
            }

            const blob = await res.blob();
            const contentDisposition = res.headers.get("content-disposition");
            let filename = `transaksi-keuangan.${exportFormat === "pdf" ? "pdf" : "xlsx"}`;

            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+?)"/);
                if (match?.[1]) {
                    filename = match[1];
                }
            }

            const downloadUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = downloadUrl;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            setExportError("Gagal mengekspor transaksi.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className={`min-h-screen pb-8 font-semibold`}>
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="location">
                            {/*@ts-expect-error weird react 19 types error*/}
                            <Typography variant="h6" color="blue-gray">
                                Lokasi
                            </Typography>
                        </label>
                        <SelectComponent<number>
                            setValue={(v) => setExportLocationId(v)}
                            options={locationDataMapped}
                            selectedOption={
                                locationDataMapped.find(r => r.value == exportLocationId)
                            }
                            placeholder={"Masukan Lokasi"}
                            isError={false}
                            className={"text-gray-800 !font-normal"}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="date">
                            {/*@ts-expect-error weird react 19 types error*/}
                            <Typography variant="h6" color="blue-gray">
                                Tanggal
                            </Typography>
                        </label>
                        <DatePicker
                            mode="range"
                            placeholder="Pilih rentang tanggal"
                            showSearchButton={false}
                            initialDate={{
                                range: exportRange
                            }}
                            onUpdate={({range}) => setExportRange(range)}
                            disabled={allTime}
                            placement={"bottom-start"}
                        />
                        {/* @ts-expect-error weird react 19 types error */}
                        <Checkbox
                            label="Semua waktu"
                            checked={allTime}
                            onChange={(e) => setAllTime(e.target.checked)}
                        />
                    </div>
                    {exportError && (
                        /* @ts-expect-error weird react 19 types error */
                        <Typography variant="small" className="text-red-600">{exportError}</Typography>
                    )}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="format">
                            {/*@ts-expect-error weird react 19 types error*/}
                            <Typography variant="h6" color="blue-gray">
                                Format File
                            </Typography>
                        </label>
                        <SelectComponent<"pdf" | "excel">
                            setValue={(v) => setExportFormat(v ?? "excel")}
                            options={formatOptions}
                            selectedOption={formatOptions.find(f => f.value === exportFormat)}
                            placeholder={"Pilih format"}
                            isError={false}
                            className={"text-gray-800 !font-normal"}
                        />
                    </div>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Button
                        color="blue"
                        onClick={handleExport}
                        disabled={isExporting || !exportLocationId}
                        className="whitespace-nowrap"
                    >
                        {isExporting ? "Sedang menyiapkan..." : "Export Transaksi"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

