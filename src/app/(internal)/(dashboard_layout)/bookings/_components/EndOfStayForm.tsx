"use client";

import React, {useState} from 'react';
import {
    Button,
    Dialog,
    DialogBody,
    DialogFooter,
    DialogHeader,
    Input,
    Option,
    Select,
    Typography
} from '@material-tailwind/react';
import {Booking, DepositStatus} from '@prisma/client';
import {useMutation} from "@tanstack/react-query";
import {toast} from "react-toastify";
import {scheduleEndOfStayAction} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";

interface EndOfStayFormProps {
    booking: Booking;
    open: boolean;
    onClose: () => void;
}

export function EndOfStayForm({ booking, open, onClose }: EndOfStayFormProps) {
    const [endDate, setEndDate] = useState('');
    const [depositStatus, setDepositStatus] = useState<DepositStatus | undefined>();
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
            depositStatus,
        });
    };

    return (
        <Dialog open={open} handler={onClose}>
            <DialogHeader>Jadwalkan Berhenti Sewa</DialogHeader>
            <DialogBody divider>
                <div className="flex flex-col gap-4">
                    <Typography>
                        Pilih tanggal berhenti untuk pemesanan ini.
                    </Typography>
                    <Input
                        type="date"
                        label="Tanggal Berhenti"
                        value={endDate}
                        onChange={handleDateChange}
                        min={booking.start_date.toISOString().split('T')[0]}
                    />
                    {showWarning && (
                        <Typography color="amber">
                            Peringatan: Tanggal yang dipilih kurang dari satu bulan dari sekarang. Ini dapat menyebabkan deposit hangus.
                        </Typography>
                    )}
                    <Select
                        label="Status Deposit"
                        value={depositStatus}
                        onChange={(val) => setDepositStatus(val as DepositStatus)}
                    >
                        <Option value={DepositStatus.HELD}>Tahan Deposit</Option>
                        <Option value={DepositStatus.REFUNDED}>Kembalikan Deposit</Option>
                        <Option value={DepositStatus.FORFEITED}>Hanguskan Deposit</Option>
                    </Select>
                </div>
            </DialogBody>
            <DialogFooter>
                <Button variant="text" color="red" onClick={onClose} className="mr-1">
                    <span>Batal</span>
                </Button>
                <Button variant="gradient" color="green" onClick={handleSubmit}>
                    <span>Simpan</span>
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
