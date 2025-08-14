"use client";

import React, {useEffect, useMemo, useState} from "react";
import {Button, Checkbox, Input, Typography} from "@material-tailwind/react";
import {DepositStatus, Prisma} from "@prisma/client";
import {DEPOSIT_STATUS_LABELS} from "@/app/_lib/enum-translations";
import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import {ZodFormattedError} from "zod";
import {AnimatePresence, motion, MotionConfig} from "framer-motion";
import CurrencyInput from "@/app/_components/input/currencyInput";
import {SelectComponent, SelectOption} from "@/app/_components/input/select";

interface DepositFormData {
    id?: number;
    booking_id: number | undefined;
    amount: number | undefined;
    status: DepositStatus;
    refunded_amount?: number | undefined;
}

export function DepositForm(props: TableFormProps<any>) {
    const [form, setForm] = useState<DepositFormData>(
        props.contentData
            ? {
                id: props.contentData.id,
                booking_id: props.contentData.booking_id ? Number(props.contentData.booking_id) : undefined,
                amount: props.contentData.amount ? Number(props.contentData.amount) : undefined,
                status: props.contentData.status ?? "HELD",
                refunded_amount: props.contentData.refunded_amount ? Number(props.contentData.refunded_amount) : undefined,
            }
            : {
                id: undefined,
                booking_id: undefined,
                amount: undefined,
                status: "HELD",
                refunded_amount: undefined,
            }
    );
    const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<DepositFormData> | undefined>(props.mutationResponse?.errors);
    const [understoodWarning, setUnderstoodWarning] = useState(false);

    const [initialData, setInitialData] = useState<Partial<DepositFormData>>(props.contentData ?? {});

    // Function to compare initial and current form data
    const hasChanges = (initialData: Partial<DepositFormData>, currentData: Partial<DepositFormData>) => {
        return JSON.stringify(initialData) !== JSON.stringify(currentData);
    };

    // Status options for SelectComponent
    const statusOptions: SelectOption<DepositStatus>[] = [
        {value: "HELD", label: DEPOSIT_STATUS_LABELS["HELD"]},
        {value: "APPLIED", label: DEPOSIT_STATUS_LABELS["APPLIED"]},
        {value: "PARTIALLY_REFUNDED", label: DEPOSIT_STATUS_LABELS["PARTIALLY_REFUNDED"]},
        {value: "REFUNDED", label: DEPOSIT_STATUS_LABELS["REFUNDED"]},
    ];

    useEffect(() => {
        setFieldErrors(props.mutationResponse?.errors);
    }, [props.mutationResponse?.errors]);

    // Use effect to set initialData when the component mounts
    useEffect(() => {
        const newData = props.contentData
            ? {
                id: props.contentData.id,
                booking_id: props.contentData.booking_id ? Number(props.contentData.booking_id) : undefined,
                amount: props.contentData.amount ? Number(props.contentData.amount) : undefined,
                status: props.contentData.status ?? "HELD",
                refunded_amount: props.contentData.refunded_amount ? Number(props.contentData.refunded_amount) : undefined,
            }
            : {
                id: undefined,
                booking_id: undefined,
                amount: undefined,
                status: "HELD",
                refunded_amount: undefined,
            };
        setInitialData(newData);
    }, [props.contentData]);

    const isButtonDisabled = useMemo(() => {
        const basicValidation = !form.booking_id || !form.amount || form.amount <= 0;
        const warningValidation = form.id ? !understoodWarning : false; // Only require checkbox when editing
        return basicValidation || warningValidation || !hasChanges(initialData, form);
    }, [form, understoodWarning, initialData]);

    function handleChange<K extends keyof DepositFormData>(key: K, value: DepositFormData[K]) {
        setForm((prev) => ({...prev, [key]: value}));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
    };

    return (
        <div className={"w-full px-8 py-4"}>
            <h1 className={"text-xl font-semibold text-black"}>{(form.id) ? "Perubahan" : "Pembuatan"} Deposit</h1>
            <form className={"mt-4"} onSubmit={handleSubmit}>
                <div className="mb-1 flex flex-col gap-6">
                    <MotionConfig
                        key={"deposit_form"}
                        transition={{duration: 0.5}}
                    >
                        <AnimatePresence>
                            <motion.div
                                key={"booking_id"}
                                initial={{opacity: 0, height: 0}}
                                animate={{opacity: 1, height: "auto"}}
                                exit={{opacity: 0, height: 0}}
                            >
                                <label htmlFor="booking_id">
                                    {/*@ts-expect-error weird react 19 types error*/}
                                    <Typography variant="h6" color="blue-gray">
                                        ID Booking
                                    </Typography>
                                </label>
                                {/* @ts-expect-error weird react 19 types error */}
                                <Input
                                    type="number"
                                    variant="outlined"
                                    size="lg"
                                    value={form.booking_id || ""}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === "" || value === "0") {
                                            handleChange("booking_id", undefined);
                                        } else {
                                            const numValue = Number(value);
                                            if (!isNaN(numValue)) {
                                                handleChange("booking_id", numValue);
                                            }
                                        }
                                    }}
                                    placeholder="Masukkan ID Booking"
                                    error={!!fieldErrors?.booking_id}
                                    className={`${!!fieldErrors?.booking_id ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                    labelProps={{
                                        className: "before:content-none after:content-none",
                                    }}
                                    disabled={!!form.id}
                                />
                                {fieldErrors?.booking_id && (
                                    // @ts-expect-error weird react 19 types error
                                    <Typography color="red">{fieldErrors.booking_id._errors}</Typography>
                                )}
                            </motion.div>
                            <motion.div
                                key={"amount"}
                                initial={{opacity: 0, height: 0}}
                                animate={{opacity: 1, height: "auto"}}
                                exit={{opacity: 0, height: 0}}
                            >
                                <label htmlFor="amount">
                                    {/*@ts-expect-error weird react 19 types error*/}
                                    <Typography variant="h6" color="blue-gray">
                                        Jumlah
                                    </Typography>
                                </label>
                                <CurrencyInput
                                    variant="outlined"
                                    size="lg"
                                    value={form.amount}
                                    setValue={(newValue) => handleChange("amount", newValue)}
                                    placeholder="Masukkan jumlah deposit"
                                    error={!!fieldErrors?.amount}
                                    className={`${!!fieldErrors?.amount ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                    labelProps={{
                                        className: "before:content-none after:content-none",
                                    }}
                                />
                                {fieldErrors?.amount && (
                                    // @ts-expect-error weird react 19 types error
                                    <Typography color="red">{fieldErrors.amount._errors}</Typography>
                                )}
                            </motion.div>
                            <motion.div
                                key={"status"}
                                initial={{opacity: 0, height: 0}}
                                animate={{opacity: 1, height: "auto"}}
                                exit={{opacity: 0, height: 0}}
                            >
                                <label htmlFor="status">
                                    {/*@ts-expect-error weird react 19 types error*/}
                                    <Typography variant="h6" color="blue-gray">
                                        Status
                                    </Typography>
                                </label>
                                <SelectComponent<DepositStatus>
                                    setValue={(value) => handleChange("status", value as DepositStatus)}
                                    options={statusOptions}
                                    selectedOption={statusOptions.find(option => option.value === form.status)}
                                    placeholder="Pilih Status"
                                    isError={!!fieldErrors?.status}
                                />
                                {fieldErrors?.status && (
                                    // @ts-expect-error weird react 19 types error
                                    <Typography color="red">{fieldErrors.status._errors}</Typography>
                                )}
                            </motion.div>
                            {(form.status === "PARTIALLY_REFUNDED" || form.status === "REFUNDED") && (
                                <motion.div
                                    key={"refunded_amount"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    <label htmlFor="refunded_amount">
                                        {/*@ts-expect-error weird react 19 types error*/}
                                        <Typography variant="h6" color="blue-gray">
                                            Jumlah Dikembalikan
                                        </Typography>
                                    </label>
                                    <CurrencyInput
                                        variant="outlined"
                                        size="lg"
                                        value={form.refunded_amount}
                                        setValue={(newValue) => handleChange("refunded_amount", newValue)}
                                        placeholder="Masukkan jumlah yang dikembalikan"
                                        error={!!fieldErrors?.refunded_amount}
                                        className={`${!!fieldErrors?.refunded_amount ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                        labelProps={{
                                            className: "before:content-none after:content-none",
                                        }}
                                    />
                                    {fieldErrors?.refunded_amount && (
                                        // @ts-expect-error weird react 19 types error
                                        <Typography color="red">{fieldErrors.refunded_amount._errors}</Typography>
                                    )}
                                </motion.div>
                            )}
                            {props.mutationResponse?.failure && (
                                <motion.div
                                    key={"failure_message"}
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: "auto"}}
                                    exit={{opacity: 0, height: 0}}
                                >
                                    {/*@ts-expect-error weird react 19 types error*/}
                                    <Typography variant="h6" color="red" className="-mb-4">
                                        {props.mutationResponse.failure}
                                    </Typography>
                                </motion.div>
                            )}
                            {form.id && (
                                <>
                                    <motion.div
                                        key={"warning_message"}
                                        initial={{opacity: 0, height: 0}}
                                        animate={{opacity: 1, height: "auto"}}
                                        exit={{opacity: 0, height: 0}}
                                        className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg"
                                    >
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-amber-600" viewBox="0 0 20 20"
                                                     fill="currentColor">
                                                    <path fillRule="evenodd"
                                                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                                          clipRule="evenodd"/>
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                {/*@ts-expect-error weird react 19 types error*/}
                                                <Typography variant="h6" color="amber"
                                                            className="font-medium text-amber-800">
                                                    Peringatan Alokasi Pembayaran
                                                </Typography>
                                                {/*@ts-expect-error weird react 19 types error*/}
                                                <Typography variant="small" color="amber"
                                                            className="mt-1 text-amber-700">
                                                    Mengubah rincian deposit dapat mempengaruhi alokasi pembayaran yang
                                                    sudah ada.
                                                    Harap periksa kembali alokasi pembayaran setelah menyimpan perubahan
                                                    ini.
                                                </Typography>
                                            </div>
                                        </div>
                                    </motion.div>
                                    <motion.div
                                        key={"warning_checkbox"}
                                        initial={{opacity: 0, height: 0}}
                                        animate={{opacity: 1, height: "auto"}}
                                        exit={{opacity: 0, height: 0}}
                                        className="mt-1"
                                    >
                                        {/*@ts-expect-error weird react 19 types error*/}
                                        <Checkbox
                                            label={
                                                // @ts-expect-error weird react 19 types error
                                                <Typography color="amber" className="font-medium text-amber-800">
                                                    Saya memahami bahwa perubahan ini dapat mempengaruhi alokasi
                                                    pembayaran yang sudah ada
                                                </Typography>
                                            }
                                            checked={understoodWarning}
                                            onChange={(e) => setUnderstoodWarning(e.target.checked)}
                                            containerProps={{
                                                className: "-ml-3",
                                            }}
                                        />
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </MotionConfig>
                </div>

                <div className={"flex gap-x-4 justify-end"}>
                    {/*@ts-expect-error weird react 19 types error*/}
                    <Button onClick={() => props.setDialogOpen(false)} variant={"outlined"} className="mt-6">
                        Batal
                    </Button>
                    {/*@ts-expect-error weird react 19 types error*/}
                    <Button
                        disabled={isButtonDisabled}
                        onClick={() => props.mutation.mutate({
                            id: form.id,
                            booking_id: form.booking_id,
                            amount: form.amount ? new Prisma.Decimal(form.amount) : undefined,
                            status: form.status,
                            refunded_amount: form.refunded_amount ? new Prisma.Decimal(form.refunded_amount) : undefined,
                        })}
                        color={"blue"}
                        className="mt-6"
                        loading={props.mutation.isPending}
                    >
                        {form.id ? "Ubah" : "Buat"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
