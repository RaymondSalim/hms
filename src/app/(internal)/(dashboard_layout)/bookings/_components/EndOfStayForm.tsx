"use client";

import React, {useState} from 'react';
import {Button, Dialog, DialogBody, DialogFooter, DialogHeader, Input, Typography} from '@material-tailwind/react';
import {Booking} from '@prisma/client';
import {useMutation} from "@tanstack/react-query";
import {toast} from "react-toastify";
import {scheduleEndOfStayAction} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";

interface EndOfStayFormProps {
    booking: Booking;
    open: boolean;
    onClose: () => void;
}

export function EndOfStayForm({booking, open, onClose}: EndOfStayFormProps) {
    const [endDate, setEndDate] = useState('');
    const [showWarning, setShowWarning] = useState(false);

    const scheduleEndOfStayMutation = useMutation({
        mutationFn: scheduleEndOfStayAction,
        onSuccess: (data) => {
            if (data.success) {
                toast.success("Berhasil memperbarui pemesanan.");
                onClose();
            } else {
                toast.error(data.failure || "Gagal memperbarui pemesanan.");
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

        // TODO! Improve warning
        // if (selectedDate < oneMonthFromNow) {
        //     setShowWarning(true);
        // } else {
        //     setShowWarning(false);
        // }
        setEndDate(e.target.value);
    };

    const handleSubmit = () => {
        if (!endDate) {
            toast.error("Silakan pilih tanggal berhenti.");
            return;
        }

        scheduleEndOfStayMutation.mutate({
            bookingId: booking.id,
            endDate: new Date(endDate),
        });
    };

    return (
        // @ts-expect-error weird react 19 types error
        <Dialog open={open} handler={onClose}>
            {/*@ts-expect-error weird react 19 types error*/}
            <DialogHeader>Jadwalkan Berhenti Sewa</DialogHeader>
            {/*@ts-expect-error weird react 19 types error*/}
            <DialogBody divider>
                <div className="flex flex-col gap-4">
                    {/*@ts-expect-error weird react 19 types error*/}
                    <Typography>
                        Pilih tanggal berhenti untuk pemesanan ini.
                    </Typography>
                    {/*@ts-expect-error weird react 19 types error*/}
                    <Input
                        type="date"
                        label="Tanggal Berhenti"
                        value={endDate}
                        onChange={handleDateChange}
                        min={booking.start_date.toISOString().split('T')[0]}
                    />
                    {showWarning && (
                        // @ts-expect-error weird react 19 types error
                        <Typography color="amber">
                            Peringatan: Tanggal yang dipilih kurang dari satu bulan dari sekarang. Ini dapat menyebabkan
                            deposit hangus.
                        </Typography>
                    )}
                    {/*@ts-expect-error weird react 19 types error*/}
                    <Typography color="blue-gray" className="text-sm">
                        <strong>Info:</strong> Status deposit akan diatur saat check-out, bukan saat menjadwalkan berhenti sewa.
                    </Typography>
                </div>
            </DialogBody>
            {/*@ts-expect-error weird react 19 types error*/}
            <DialogFooter>
                {/*@ts-expect-error weird react 19 types error*/}
                <Button variant="text" color="red" onClick={onClose} className="mr-1">
                    Batal
                </Button>
                {/*@ts-expect-error weird react 19 types error*/}
                <Button onClick={handleSubmit} disabled={scheduleEndOfStayMutation.isPending}>
                    {scheduleEndOfStayMutation.isPending ? "Memproses..." : "Jadwalkan"}
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
