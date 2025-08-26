"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
    Button,
    Dialog,
    DialogBody,
    DialogFooter,
    DialogHeader,
    Input,
    Select,
    Option,
    Typography
} from "@material-tailwind/react";
import { scheduleEndOfAddonAction } from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import { BookingAddOn, AddOn } from "@prisma/client";
import { BookingsIncludeAll } from "@/app/_db/bookings";

interface EndOfAddonFormProps {
    booking: BookingsIncludeAll;
    open: boolean;
    onClose: () => void;
}

export function EndOfAddonForm({ booking, open, onClose }: EndOfAddonFormProps) {
    const [selectedAddonId, setSelectedAddonId] = useState<string>("");
    const [endDate, setEndDate] = useState("");
    const [showWarning, setShowWarning] = useState(false);

    // Filter only rolling addons
    const rollingAddons = booking.addOns.filter(addon => addon.is_rolling);

    const scheduleEndOfAddonMutation = useMutation({
        mutationFn: scheduleEndOfAddonAction,
        onSuccess: (data) => {
            if (data.success) {
                toast.success("Berhasil menjadwalkan berhenti layanan tambahan.");
                onClose();
            } else {
                toast.error(data.failure || "Gagal menjadwalkan berhenti layanan tambahan.");
            }
        },
        onError: (error: any) => {
            toast.error(error.message || "Terjadi kesalahan.");
        }
    });

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedDate = new Date(e.target.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const oneMonthFromNow = new Date(today.setMonth(today.getMonth() + 1));

        if (selectedDate < oneMonthFromNow) {
            setShowWarning(true);
        } else {
            setShowWarning(false);
        }
        setEndDate(e.target.value);
    };

    const handleSubmit = () => {
        if (!selectedAddonId) {
            toast.error("Silakan pilih layanan tambahan.");
            return;
        }

        if (!endDate) {
            toast.error("Silakan pilih tanggal berhenti.");
            return;
        }

        scheduleEndOfAddonMutation.mutate({
            bookingId: booking.id,
            addonId: selectedAddonId,
            endDate: new Date(endDate),
        });
    };

    if (rollingAddons.length === 0) {
        return (
            // @ts-expect-error weird react 19 types error
            <Dialog open={open} handler={onClose}>
                {/*@ts-expect-error weird react 19 types error*/}
                <DialogHeader>Jadwalkan Berhenti Layanan Tambahan</DialogHeader>
                {/*@ts-expect-error weird react 19 types error*/}
                <DialogBody divider>
                    <div className="flex flex-col gap-4">
                        {/*@ts-expect-error weird react 19 types error*/}
                        <Typography>
                            Tidak ada layanan tambahan rolling yang dapat dijadwalkan berhenti.
                        </Typography>
                    </div>
                </DialogBody>
                {/*@ts-expect-error weird react 19 types error*/}
                <DialogFooter>
                    {/*@ts-expect-error weird react 19 types error*/}
                    <Button variant="text" color="red" onClick={onClose}>
                        Tutup
                    </Button>
                </DialogFooter>
            </Dialog>
        );
    }

    return (
        // @ts-expect-error weird react 19 types error
        <Dialog open={open} handler={onClose}>
            {/*@ts-expect-error weird react 19 types error*/}
            <DialogHeader>Jadwalkan Berhenti Layanan Tambahan</DialogHeader>
            {/*@ts-expect-error weird react 19 types error*/}
            <DialogBody divider>
                <div className="flex flex-col gap-4">
                    {/*@ts-expect-error weird react 19 types error*/}
                    <Typography>
                        Pilih layanan tambahan dan tanggal berhenti untuk layanan tersebut.
                    </Typography>

                    {/* Addon Selection */}
                    <div>
                        {/*@ts-expect-error weird react 19 types error*/}
                        <Typography variant="h6" color="blue-gray">
                            Layanan Tambahan
                        </Typography>
                        {/*@ts-expect-error weird react 19 types error*/}
                        <Select
                            value={selectedAddonId}
                            onChange={(value) => setSelectedAddonId(value || "")}
                            placeholder="Pilih layanan tambahan"
                        >
                            {rollingAddons.map((addon) => (
                                <Option key={addon.id} value={addon.id}>
                                    {(addon as any).addOn?.name || "Unknown Addon"}
                                </Option>
                            ))}
                        </Select>
                    </div>

                    {/* End Date */}
                    <div>
                        {/*@ts-expect-error weird react 19 types error*/}
                        <Typography variant="h6" color="blue-gray">
                            Tanggal Berhenti
                        </Typography>
                        {/*@ts-expect-error weird react 19 types error*/}
                        <Input
                            type="date"
                            label="Tanggal Berhenti"
                            value={endDate}
                            onChange={handleDateChange}
                            min={new Date().toISOString().split('T')[0]}
                        />
                        {showWarning && (
                            // @ts-expect-error weird react 19 types error
                            <Typography color="amber">
                                Peringatan: Tanggal yang dipilih kurang dari satu bulan dari sekarang.
                            </Typography>
                        )}
                    </div>

                    {/*@ts-expect-error weird react 19 types error*/}
                    <Typography color="blue-gray" className="text-sm">
                        <strong>Info:</strong> Layanan tambahan akan berhenti pada tanggal yang dipilih.
                    </Typography>
                </div>
            </DialogBody>
            {/*@ts-expect-error weird react 19 types error*/}
            <DialogFooter>
                {/*@ts-expect-error weird react 19 types error*/}
                <Button variant="text" color="red" onClick={onClose}>
                    Batal
                </Button>
                {/*@ts-expect-error weird react 19 types error*/}
                <Button 
                    onClick={handleSubmit}
                    disabled={!selectedAddonId || !endDate || scheduleEndOfAddonMutation.isPending}
                >
                    {scheduleEndOfAddonMutation.isPending ? "Memproses..." : "Jadwalkan Berhenti"}
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
