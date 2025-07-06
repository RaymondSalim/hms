"use client";

import React, {useEffect, useState} from "react";
import {Button, Input, Typography} from "@material-tailwind/react";
import {BillItem, Prisma} from "@prisma/client";
import {formatToIDR} from "@/app/_lib/util";
import {ZodFormattedError} from "zod";

interface BillItemFormProps {
    billItem?: BillItem;
    billId: number;
    onSave: (data: {
        id?: number;
        description: string;
        amount: number;
        internal_description?: string;
    }) => Promise<any>;
    onCancel: () => void;
    isEdit?: boolean;
    mutationResponse?: {
        errors?: ZodFormattedError<any>;
        failure?: string;
    };
    isPending?: boolean;
}

export function BillItemForm({
    billItem,
    billId,
    onSave,
    onCancel,
    isEdit = false,
    mutationResponse,
    isPending = false
}: BillItemFormProps) {
    const [data, setData] = useState({
        description: billItem?.description || "",
        amount: billItem?.amount ? new Prisma.Decimal(billItem.amount).toNumber() : 0,
        internal_description: billItem?.internal_description || "",
    });

    const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<any> | undefined>(mutationResponse?.errors);

    useEffect(() => {
        setFieldErrors(mutationResponse?.errors);
    }, [mutationResponse?.errors]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const submitData = {
            ...(isEdit && billItem ? { id: billItem.id } : {}),
            description: data.description,
            amount: data.amount,
            internal_description: data.internal_description || undefined,
        };

        await onSave(submitData);
    };

    const isFormValid = data.description.trim() !== "" && data.amount > 0;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Typography variant="h6" color="blue-gray" className="mb-2">
                    Deskripsi
                </Typography>
                <Input
                    type="text"
                    placeholder="Masukkan deskripsi rincian tagihan"
                    value={data.description}
                    onChange={(e) => setData(prev => ({ ...prev, description: e.target.value }))}
                    error={!!fieldErrors?.fieldErrors?.description}
                    className="!border !border-gray-300 bg-white text-gray-900 shadow-lg shadow-gray-900/5 ring-4 ring-transparent placeholder:text-gray-500 focus:!border-gray-900 focus:!border-t-gray-900 focus:ring-gray-900/10"
                    labelProps={{
                        className: "hidden",
                    }}
                    containerProps={{ className: "min-w-[100px]" }}
                />
                {fieldErrors?.fieldErrors?.description && (
                    <Typography variant="small" color="red" className="mt-1">
                        {fieldErrors.fieldErrors.description}
                    </Typography>
                )}
            </div>

            <div>
                <Typography variant="h6" color="blue-gray" className="mb-2">
                    Jumlah (Rp)
                </Typography>
                <Input
                    type="number"
                    placeholder="0"
                    value={data.amount}
                    onChange={(e) => setData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    error={!!fieldErrors?.fieldErrors?.amount}
                    className="!border !border-gray-300 bg-white text-gray-900 shadow-lg shadow-gray-900/5 ring-4 ring-transparent placeholder:text-gray-500 focus:!border-gray-900 focus:!border-t-gray-900 focus:ring-gray-900/10"
                    labelProps={{
                        className: "hidden",
                    }}
                    containerProps={{ className: "min-w-[100px]" }}
                />
                <Typography variant="small" color="gray" className="mt-1">
                    {formatToIDR(data.amount)}
                </Typography>
                {fieldErrors?.fieldErrors?.amount && (
                    <Typography variant="small" color="red" className="mt-1">
                        {fieldErrors.fieldErrors.amount}
                    </Typography>
                )}
            </div>

            <div>
                <Typography variant="h6" color="blue-gray" className="mb-2">
                    Deskripsi Internal (Opsional)
                </Typography>
                <Input
                    type="text"
                    placeholder="Masukkan deskripsi internal (opsional)"
                    value={data.internal_description}
                    onChange={(e) => setData(prev => ({ ...prev, internal_description: e.target.value }))}
                    error={!!fieldErrors?.fieldErrors?.internal_description}
                    className="!border !border-gray-300 bg-white text-gray-900 shadow-lg shadow-gray-900/5 ring-4 ring-transparent placeholder:text-gray-500 focus:!border-gray-900 focus:!border-t-gray-900 focus:ring-gray-900/10"
                    labelProps={{
                        className: "hidden",
                    }}
                    containerProps={{ className: "min-w-[100px]" }}
                />
                {fieldErrors?.fieldErrors?.internal_description && (
                    <Typography variant="small" color="red" className="mt-1">
                        {fieldErrors.fieldErrors.internal_description}
                    </Typography>
                )}
            </div>

            {mutationResponse?.failure && (
                <Typography variant="h6" color="red" className="mt-2">
                    {mutationResponse.failure}
                </Typography>
            )}

            <div className="flex gap-x-4 justify-end pt-4">
                <Button 
                    onClick={onCancel} 
                    variant="outlined" 
                    className="mt-2"
                    disabled={isPending}
                >
                    Batal
                </Button>
                <Button 
                    type="submit"
                    disabled={!isFormValid || isPending}
                    color="blue" 
                    className="mt-2"
                    loading={isPending}
                >
                    {isEdit ? "Ubah" : "Tambah"}
                </Button>
            </div>
        </form>
    );
} 