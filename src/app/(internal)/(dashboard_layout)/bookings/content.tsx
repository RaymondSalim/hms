"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React, {useEffect, useRef, useState} from "react";
import {formatToDateTime, formatToIDR} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {useHeader} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {
    checkInOutAction,
    deleteBookingAction,
    upsertBookingAction
} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import {BookingForm} from "@/app/(internal)/(dashboard_layout)/bookings/form";
import {
    Button,
    Card,
    CardBody,
    CardFooter,
    Dialog,
    DialogBody,
    DialogFooter,
    DialogHeader,
    Input,
    Option,
    Select,
    Typography
} from "@material-tailwind/react";
import {TbDoorEnter, TbDoorExit} from "react-icons/tb";
import {useMutation, useQuery} from "@tanstack/react-query";
import {CheckInOutType} from "@/app/(internal)/(dashboard_layout)/bookings/enum";
import {BookingsIncludeAll} from "@/app/_db/bookings";
import {usePathname, useRouter} from "next/navigation";
import {BookingPageQueryParams} from "@/app/(internal)/(dashboard_layout)/bookings/page";
import {DepositStatus, Prisma} from "@prisma/client";
import {SelectOption} from "@/app/_components/input/select";
import {MdContentCopy} from "react-icons/md";
import {toast} from "react-toastify";
import CurrencyInput from "@/app/_components/input/currencyInput";
import {getUnpaidBillsDueAction} from "@/app/(internal)/(dashboard_layout)/bills/bill-action";
import {EndOfStayForm} from "@/app/(internal)/(dashboard_layout)/bookings/_components/EndOfStayForm";


export interface BookingsContentProps {
    bookings: BookingsIncludeAll[]
    queryParams?: BookingPageQueryParams
}

const colorMapping: Map<string, string> = new Map([
    ["default", "text-black"]
]);

export default function BookingsContent({bookings, queryParams}: BookingsContentProps) {
    const headerContext = useHeader();

    const [newQueryParams, setNewQueryParams] = useState<typeof queryParams>(queryParams);
    const [bookingsState, setBookingsState] = useState<BookingsIncludeAll[]>(bookings);
    let [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
    let [confirmationDialogContent, setConfirmationDialogContent] = useState({title: "", body: ""});
    let [onConfirm, setOnConfirm] = useState(() => () => {
    });
    let [onCancel, setOnCancel] = useState(() => () => {
    });

    // End of Stay dialog states
    const [showEndOfStayDialog, setShowEndOfStayDialog] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<BookingsIncludeAll | null>(null);

    // Detail dialog states
    let [dialogContent, setDialogContent] = useState(<></>);
    let [showDialog, setShowDialog] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);

    // Ensure the dialog scrolls to the top when opened
    useEffect(() => {
        if (showDialog) {
            const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
            delay(10).then(() => requestAnimationFrame(() => {
                dialogRef.current?.scrollTo({top: 0, behavior: "smooth"});
            }));
        }
    }, [showDialog, dialogContent]);

    // Check in/out confirmation dialog states
    const [showCheckInOutDialog, setShowCheckInOutDialog] = useState(false);
    const [checkInOutData, setCheckInOutData] = useState<{
        booking_id: number;
        action: CheckInOutType;
        depositStatus?: DepositStatus;
        refundedAmount?: number;
    } | null>(null);
    const [selectedDepositStatus, setSelectedDepositStatus] = useState<DepositStatus | undefined>();
    const [refundedAmount, setRefundedAmount] = useState<number | undefined>(undefined);
    const [eventDate, setEventDate] = useState<string>('');

    // Query for unpaid bills when checkout dialog is open
    const {data: unpaidBillsData} = useQuery({
        queryKey: ['unpaid-bills', checkInOutData?.booking_id],
        queryFn: () => getUnpaidBillsDueAction(checkInOutData?.booking_id),
        enabled: showCheckInOutDialog && checkInOutData?.action === CheckInOutType.CHECK_OUT && !!checkInOutData?.booking_id,
    });

    const checkIncCheckOutMutation = useMutation({
        mutationFn: checkInOutAction,
        onSuccess: (data) => {
            if (data.success) {
                setBookingsState(prev => {
                    let bookingIndex = prev.findIndex(b => b.id == data.success!.booking_id);
                    if (bookingIndex >= 0) {
                        prev[bookingIndex].checkInOutLogs.push(data.success!);
                    }
                    return [...prev];
                });
                toast.success("Aksi berhasil dilakukan");
                setShowCheckInOutDialog(false);
                setCheckInOutData(null);
                setSelectedDepositStatus(undefined);
                setRefundedAmount(undefined);
            }
        },
        onError: (error: any) => {
            toast.error(error.message || "Gagal melakukan aksi");
        }
    });

    const router = useRouter();
    const pathname = usePathname();
    const removeQueryParams = () => {
        router.replace(`${pathname}`);
        setNewQueryParams(undefined);
    };

    const handleUpsert = async (data: any) => {
        try {
            return await upsertBookingAction(data);
        } catch (e: any) {
            toast.error(e.message || "Gagal menyimpan perubahan.");
            throw e;
        }
    };

    const handleDelete = (data: number) => {
        return new Promise((resolve, reject) => {
            setConfirmationDialogContent({
                title: "Konfirmasi Hapus",
                body: "Menghapus pemesanan ini akan menghapus semua pembayaran dan tagihan yang terkait (termasuk yang sudah lampau). Tindakan ini tidak dapat dibatalkan. Harap pastikan Anda benar-benar ingin menghapus pemesanan ini."
            });
            setOnConfirm(() => async () => {
                try {
                    const result = await deleteBookingAction(data);
                    resolve(result);
                } catch (e: any) {
                    toast.error(e.message || "Gagal menghapus pemesanan.");
                    reject(e);
                } finally {
                    setShowConfirmationDialog(false);
                }
            });
            setOnCancel(() => () => {
                setShowConfirmationDialog(false);
                reject("Cancelled");
            });
            setShowConfirmationDialog(true);
        });
    };

    const handleCheckInOut = (booking: BookingsIncludeAll, action: CheckInOutType) => {
        setCheckInOutData({
            booking_id: booking.id,
            action: action
        });

        // Check if current date is within booking range
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const startDate = booking.start_date.toISOString().split('T')[0];
        const endDate = booking.end_date ? booking.end_date.toISOString().split('T')[0] : null;

        // Set default date to today if within range, otherwise undefined
        let isWithinRange = today >= startDate;
        if (endDate) {
            isWithinRange = isWithinRange && today <= endDate;
        }

        if (isWithinRange) {
            setEventDate(today);
        } else {
            setEventDate('');
        }

        setShowCheckInOutDialog(true);
    };

    const confirmCheckInOut = () => {
        if (!checkInOutData) return;

        // Validate that a date is selected
        if (!eventDate) {
            toast.error("Harap pilih tanggal untuk tindakan ini.");
            return;
        }

        // Convert local date to UTC date
        const localDate = new Date(eventDate);
        const utcDate = new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000));

        const mutationData: any = {
            booking_id: checkInOutData.booking_id,
            action: checkInOutData.action,
            eventDate: utcDate,
        };

        // Add deposit handling for checkout
        if (checkInOutData.action === CheckInOutType.CHECK_OUT && selectedDepositStatus) {
            mutationData.depositStatus = selectedDepositStatus;
            if (refundedAmount && refundedAmount > 0) {
                mutationData.refundedAmount = refundedAmount;
            }
        }

        checkIncCheckOutMutation.mutate(mutationData);
    };

    const cancelCheckInOut = () => {
        setShowCheckInOutDialog(false);
        setCheckInOutData(null);
        setSelectedDepositStatus(undefined);
        setRefundedAmount(undefined);
        setEventDate('');
    };

    const columnHelper = createColumnHelper<BookingsIncludeAll>();
    const columns = [
        columnHelper.accessor(row => row.id, {
            id: "id",
            header: "ID",
            enableColumnFilter: true,
            size: 20,
        }),
        columnHelper.accessor(row => `${row.tenants?.name} | ${row.tenants?.phone}`, {
            id: "tenant",
            header: "Penyewa",
            enableColumnFilter: true,
            cell: props => {
                const data = props.row.original.tenants;
                return ( // TODO! Make link
                    <div className={"flex flex-col gap-y-1"}>
                        <span>{data?.name}</span>
                        <span>{data?.phone}</span>
                    </div>
                );
            },
            sortingFn: (rowA, rowB) => {
                return rowA.original.tenants?.name.localeCompare(rowB.original.tenants?.name ?? '') ?? 0;
            },
        }),
        columnHelper.accessor(row => row.bookingstatuses?.status, {
            id: "status",
            header: "Status",
            enableColumnFilter: true,
            cell: props => <span className={colorMapping.get(props.getValue() ?? "default")}>{props.getValue()}</span>
        }),
        columnHelper.accessor(row => row.rooms?.room_number, {
            id: "room_number",
            header: "Nomor Kamar",
            enableColumnFilter: true,
        }),
        columnHelper.accessor(row => formatToDateTime(row.start_date, false), {
            header: "Tanggal Mulai",
        }),
        columnHelper.accessor(row => row.end_date ? formatToDateTime(row.end_date, false) : "-", {
            header: "Tanggal Selesai",
        }),
        columnHelper.accessor(row => formatToIDR(new Prisma.Decimal(row.fee).toNumber()), {
            id: "fee",
            header: "Biaya",
        }),
        columnHelper.display({
            header: "Tagihan",
            cell: props =>
                <Link className={"text-blue-400"} type="button" href={{
                    pathname: "/bills",
                    query: {
                        booking_id: props.cell.row.original.id,
                    }
                }}>Lihat Tagihan</Link>
        }),
        columnHelper.display({
            header: "Detail",
            cell: props =>
                <Link className={"text-blue-400"} type="button" href="" onClick={() => {
                    setDialogContent(<BookingInfo booking={props.row.original}/>);
                    setShowDialog(true);
                }}>Lihat Selengkapnya</Link>
        }),
    ];

    const filterKeys: SelectOption<string>[] = columns
        .filter(c => (
            c.enableColumnFilter && c.header && c.id
        ))
        .map(c => ({
            label: c.header!.toString(),
            value: c.id!,
        }));

    if (!headerContext.locationID) {
        // @ts-ignore
        columns.splice(1, 0, columnHelper.accessor(row => row.rooms?.locations?.name, {
                header: "Lokasi",
                enableColumnFilter: false,
                size: 20
            })
        );
    }

    return (
        <TableContent<BookingsIncludeAll>
            name={"Pemesanan"}
            initialContents={bookingsState}
            queryParams={
                newQueryParams ? {
                    action: "search",
                    values: newQueryParams,
                    clearQueryParams: removeQueryParams
                } : undefined
            }
            columns={columns}
            form={
                // @ts-expect-error missing props definition
                <BookingForm/>
            }
            searchPlaceholder={"Cari"} // TODO!
            filterKeys={filterKeys}
            searchType="smart"
            upsert={{
                // @ts-ignore
                mutationFn: handleUpsert,
            }}
            delete={{
                // @ts-ignore
                mutationFn: handleDelete,
            }}
            additionalActions={{
                position: "before",
                actions: [
                    {
                        generateButton: (rowData) => {
                            const checkInExists = rowData.checkInOutLogs?.find(l => l.event_type == CheckInOutType.CHECK_IN);

                            return (
                                <Button
                                    key={`${rowData.id}_in`}
                                    size={"sm"}
                                    color="blue"
                                    className="flex items-center gap-2 w-fit"
                                    onClick={() => handleCheckInOut(rowData, CheckInOutType.CHECK_IN)}
                                    disabled={!!checkInExists}
                                >
                                    <TbDoorEnter className={"text-white h-5 w-5"}/>
                                    <span className={"text-white whitespace-nowrap"}>Check In</span>
                                </Button>
                            );
                        },
                    },
                    {
                        generateButton: (rowData) => {
                            const checkInExists = rowData.checkInOutLogs?.some(l => l.event_type == CheckInOutType.CHECK_IN);
                            const checkOutExists = rowData.checkInOutLogs?.some(l => l.event_type == CheckInOutType.CHECK_OUT);

                            let disabled = !checkInExists || (checkInExists && checkOutExists);

                            return (
                                <Button
                                    key={`${rowData.id}_out`}
                                    size={"sm"}
                                    color="red"
                                    className="flex items-center gap-2 w-fit"
                                    onClick={() => handleCheckInOut(rowData, CheckInOutType.CHECK_OUT)}
                                    disabled={disabled}
                                >
                                    <TbDoorExit className={"text-white h-5 w-5"}/>
                                    <span className={"text-white whitespace-nowrap"}>Check Out</span>
                                </Button>
                            );
                        },
                    },
                    {
                        generateButton: (rowData) => {
                            if (!rowData.is_rolling || rowData.end_date) {
                                return <></>;
                            }
                            return (
                                <Button
                                    key={`${rowData.id}_end_of_stay`}
                                    size={"sm"}
                                    color="orange"
                                    className="flex items-center gap-2 w-fit"
                                    onClick={() => {
                                        setSelectedBooking(rowData);
                                        setShowEndOfStayDialog(true);
                                    }}
                                >
                                    <span className={"text-white whitespace-nowrap"}>Jadwalkan Berhenti Sewa</span>
                                </Button>
                            );
                        }
                    },
                    {
                        generateButton: (rowData, setActiveContent, setDialogOpen) => (
                            <MdContentCopy
                                className="h-5 w-5 cursor-pointer hover:text-green-500"
                                onClick={() => {
                                    const {
                                        id,
                                        rooms: rowRooms,
                                        durations,
                                        bookingstatuses,
                                        tenants,
                                        checkInOutLogs,
                                        end_date,
                                        createdAt,
                                        updatedAt,
                                        ...rest
                                    } = rowData;
                                    const duplicatedBooking: Partial<BookingsIncludeAll> = {
                                        ...rest,
                                        rooms: rowRooms,
                                        durations: durations,
                                        bookingstatuses: bookingstatuses,
                                        tenants: tenants,
                                        checkInOutLogs: checkInOutLogs,
                                        end_date: end_date,
                                        createdAt: createdAt,
                                        updatedAt: updatedAt,
                                        addOns: rowData.addOns?.map(addon => ({
                                            ...addon,
                                            id: undefined,
                                            booking_id: undefined,
                                            createdAt: undefined,
                                            updatedAt: undefined
                                        })) as any,
                                    };
                                    setActiveContent(duplicatedBooking as BookingsIncludeAll);
                                    setDialogOpen(true);
                                }}
                            />
                        )
                    },
                ]
            }}
            customDialog={
                <>
                    <Dialog
                        open={showDialog}
                        size={"md"}
                        handler={() => setShowDialog(prev => !prev)}
                        className={"flex flex-col gap-y-4 p-8 h-[80dvh]"}
                    >
                        <div ref={dialogRef} className="overflow-y-auto h-full">
                            {dialogContent}
                        </div>
                        <div className={"flex gap-x-4 justify-end"}>
                            <Button onClick={() => setShowDialog(false)} variant={"filled"} className="mt-6">
                                Tutup
                            </Button>
                        </div>
                    </Dialog>

                    <Dialog
                        key={"confirmation-dialog"}
                        open={showConfirmationDialog}
                        handler={() => setShowConfirmationDialog(prev => !prev)}
                        className={"p-4"}
                    >
                        <DialogHeader>{confirmationDialogContent.title}</DialogHeader>
                        <DialogBody>
                            <Typography>{confirmationDialogContent.body}</Typography>
                        </DialogBody>
                        <DialogFooter>
                            <Button
                                variant="text"
                                color="red"
                                onClick={onCancel}
                                className="mr-1"
                            >
                                <span>Batal</span>
                            </Button>
                            <Button variant="gradient" color="green" onClick={onConfirm}>
                                <span>Konfirmasi</span>
                            </Button>
                        </DialogFooter>
                    </Dialog>

                    {selectedBooking && (
                        <EndOfStayForm
                            booking={selectedBooking}
                            open={showEndOfStayDialog}
                            onClose={() => {
                                setShowEndOfStayDialog(false);
                                setSelectedBooking(null);
                            }}
                        />
                    )}

                    <Dialog
                        key={"check-in-out-dialog"}
                        open={showCheckInOutDialog}
                        handler={() => setShowCheckInOutDialog(prev => !prev)}
                        className={"p-4"}
                        size="md"
                    >
                        <DialogHeader>
                            {checkInOutData?.action === CheckInOutType.CHECK_IN ? "Konfirmasi Check In" : "Konfirmasi Check Out"}
                        </DialogHeader>
                        <DialogBody>
                            <div className="space-y-4">
                                <Typography>
                                    {checkInOutData?.action === CheckInOutType.CHECK_IN
                                        ? "Apakah Anda yakin ingin melakukan check in untuk pemesanan ini?"
                                        : "Apakah Anda yakin ingin melakukan check out untuk pemesanan ini?"}
                                </Typography>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <Typography variant="small" className="text-yellow-800 font-medium">
                                        ⚠️ Peringatan: Tindakan ini tidak dapat dibatalkan setelah dikonfirmasi.
                                    </Typography>
                                </div>

                                {/* Unpaid bills warning for checkout */}
                                {checkInOutData?.action === CheckInOutType.CHECK_OUT && unpaidBillsData && unpaidBillsData.bills.length > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <Typography variant="small" className="text-red-800 font-medium mb-2">
                                            ⚠️ Peringatan: Ada tagihan yang belum dibayar!
                                        </Typography>
                                        <Typography variant="small" className="text-red-700">
                                            Total tagihan yang belum dibayar: {formatToIDR(unpaidBillsData.total || 0)}
                                        </Typography>
                                        <Typography variant="small" className="text-red-700">
                                            Jumlah tagihan: {unpaidBillsData.bills.length} tagihan
                                        </Typography>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Typography variant="small" className="font-medium">
                                        Tanggal:
                                    </Typography>
                                    <Input
                                        type="date"
                                        value={eventDate}
                                        onChange={e => setEventDate(e.target.value)}
                                        label="Tanggal"
                                        min={bookingsState.find(b => b.id === checkInOutData?.booking_id)?.start_date?.toISOString().split('T')[0]}
                                        max={bookingsState.find(b => b.id === checkInOutData?.booking_id)?.end_date?.toISOString().split('T')[0]}
                                    />
                                </div>

                                {checkInOutData?.action === CheckInOutType.CHECK_OUT && (
                                    <div className="space-y-4">
                                        <div className="border-t pt-4">
                                            <Typography variant="h6" className="mb-2">
                                                Informasi Deposit
                                            </Typography>
                                            {bookingsState.find(b => b.id === checkInOutData.booking_id)?.deposit ? (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between">
                                                        <span>Jumlah Deposit:</span>
                                                        <span className="font-semibold">
                                                            {formatToIDR(new Prisma.Decimal(bookingsState.find(b => b.id === checkInOutData.booking_id)?.deposit?.amount || 0).toNumber())}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Status Saat Ini:</span>
                                                        <span className="font-semibold">
                                                            {bookingsState.find(b => b.id === checkInOutData.booking_id)?.deposit?.status}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Typography variant="small" className="font-medium">
                                                            Update Status Deposit:
                                                        </Typography>
                                                        <Select
                                                            value={selectedDepositStatus || ""}
                                                            onChange={(val) => setSelectedDepositStatus(val as DepositStatus)}
                                                            label="Pilih Status Deposit"
                                                        >
                                                            <Option value="HELD">HELD</Option>
                                                            <Option value="APPLIED">APPLIED</Option>
                                                            <Option value="REFUNDED">REFUNDED</Option>
                                                            <Option value="PARTIALLY_REFUNDED">PARTIALLY_REFUNDED</Option>
                                                        </Select>
                                                    </div>

                                                    {(selectedDepositStatus === 'REFUNDED' || selectedDepositStatus === 'PARTIALLY_REFUNDED') && (
                                                        <div className="space-y-2">
                                                            <Typography variant="small" className="font-medium">
                                                                Jumlah Pengembalian:
                                                            </Typography>
                                                            <CurrencyInput
                                                                value={refundedAmount}
                                                                setValue={setRefundedAmount}
                                                                placeholder="Masukkan jumlah pengembalian"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <Typography variant="small" className="text-gray-600">
                                                    Tidak ada deposit untuk pemesanan ini.
                                                </Typography>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </DialogBody>
                        <DialogFooter>
                            <Button
                                variant="text"
                                color="red"
                                onClick={cancelCheckInOut}
                                className="mr-1"
                                disabled={checkIncCheckOutMutation.isPending}
                            >
                                <span>Batal</span>
                            </Button>
                            <Button
                                variant="gradient"
                                color={checkInOutData?.action === CheckInOutType.CHECK_IN ? "blue" : "red"}
                                onClick={confirmCheckInOut}
                                disabled={checkIncCheckOutMutation.isPending}
                            >
                                <span>
                                    {checkIncCheckOutMutation.isPending ? "Memproses..." :
                                     checkInOutData?.action === CheckInOutType.CHECK_IN ? "Check In" : "Check Out"
                                    }
                                </span>
                            </Button>
                        </DialogFooter>
                    </Dialog>
                </>
            }
        />
    );
}

interface BookingInfoProps {
    booking: BookingsIncludeAll;
}

function BookingInfo({booking}: BookingInfoProps) {
    return (
        <div className="container mx-auto p-6 h-full">
            <h1 className="text-xl font-semibold text-black">Informasi Pemesanan</h1>
            <Card className="shadow-none">
                <CardBody className="mt-4 p-0 space-y-4">
                    {/* Basic Information */}
                    <Typography variant="h5" className="font-semibold">Informasi Dasar</Typography>
                    <Typography><strong>ID Pemesanan:</strong> {booking.id}</Typography>
                    <Typography><strong>Status:</strong> {booking.bookingstatuses?.status || "N/A"}</Typography>
                    <Typography><strong>Biaya:</strong> {formatToIDR(new Prisma.Decimal(booking.fee).toNumber())}</Typography>
                    <Typography><strong>Biaya Penghuni Kedua:</strong> {booking.second_resident_fee ? formatToIDR(new Prisma.Decimal(booking.second_resident_fee).toNumber()) : "N/A"}</Typography>

                    {/* Tenant Information */}
                    <Typography variant="h5" className="font-semibold mt-4">Informasi Penyewa</Typography>
                    <Typography><strong>Nama:</strong> {booking.tenants?.name || "N/A"}</Typography>
                    <Typography><strong>Email:</strong> {booking.tenants?.email || "N/A"}</Typography>
                    <Typography><strong>Nomor Telepon:</strong> {booking.tenants?.phone || "N/A"}</Typography>
                    <Typography><strong>Nomor Identitas:</strong> {booking.tenants?.id_number || "N/A"}</Typography>

                    {/* Room Information */}
                    <Typography variant="h5" className="font-semibold mt-4">Informasi Kamar</Typography>
                    <Typography><strong>Nomor Kamar:</strong> {booking.rooms?.room_number || "N/A"}</Typography>
                    <Typography><strong>Lokasi:</strong> {(booking.rooms as any)?.locations?.name || "N/A"}</Typography>

                    {/* Duration Information */}
                    <Typography variant="h5" className="font-semibold mt-4">Informasi Durasi</Typography>
                    <Typography><strong>Durasi:</strong> {booking.durations?.duration || "N/A"}</Typography>
                    <Typography><strong>Jumlah Bulan:</strong> {booking.durations?.month_count || "N/A"}</Typography>

                    {/* Date Information */}
                    <Typography variant="h5" className="font-semibold mt-4">Informasi Tanggal</Typography>
                    <Typography><strong>Tanggal Mulai:</strong> {formatToDateTime(booking.start_date, false)}</Typography>
                    <Typography><strong>Tanggal Selesai:</strong> {
                        booking.is_rolling ?
                            "Rolling (Tiap bulan)" :
                            formatToDateTime(booking.end_date!, false)
                    }</Typography>

                    {/* Deposit Information */}
                    <Typography variant="h5" className="font-semibold mt-4">Informasi Deposit</Typography>
                    {booking.deposit ? (
                        <>
                            <Typography><strong>Jumlah Deposit:</strong> {formatToIDR(new Prisma.Decimal(booking.deposit.amount).toNumber())}</Typography>
                            <Typography><strong>Status Deposit:</strong> {booking.deposit.status}</Typography>
                        </>
                    ) : (
                        <Typography>Tidak ada deposit</Typography>
                    )}

                    {/* Add-ons Information */}
                    <Typography variant="h5" className="font-semibold mt-4">Layanan Tambahan</Typography>
                    {booking.addOns && booking.addOns.length > 0 ? (
                        <div className="space-y-2">
                            {booking.addOns.map((addon, index) => (
                                <div key={index} className="border-l-4 border-blue-500 pl-3">
                                    <Typography><strong>Nama:</strong> {(addon as any).addOn?.name || "N/A"}</Typography>
                                    <Typography><strong>Deskripsi:</strong> {(addon as any).addOn?.description || "N/A"}</Typography>
                                    <Typography><strong>Tanggal Mulai:</strong> {formatToDateTime(addon.start_date, false)}</Typography>
                                    <Typography><strong>Tanggal Selesai:</strong> {formatToDateTime(addon.end_date, false)}</Typography>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Typography>Tidak ada layanan tambahan</Typography>
                    )}

                    {/* Check In/Out Logs */}
                    <Typography variant="h5" className="font-semibold mt-4">Riwayat Check In/Out</Typography>
                    {booking.checkInOutLogs && booking.checkInOutLogs.length > 0 ? (
                        <div className="space-y-2">
                            {booking.checkInOutLogs.map((log, index) => (
                                <div key={index} className="border-l-4 border-green-500 pl-3">
                                    <Typography><strong>Tipe:</strong> {log.event_type}</Typography>
                                    <Typography><strong>Tanggal:</strong> {formatToDateTime(log.event_date)}</Typography>
                                    <Typography><strong>Dibuat Pada:</strong> {formatToDateTime(log.createdAt)}</Typography>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Typography>Belum ada riwayat check in/out</Typography>
                    )}
                </CardBody>

                <CardFooter divider className="flex items-center justify-between py-3">
                    <Typography variant="small" color="gray">
                        Dibuat Pada: {formatToDateTime(booking.createdAt)}
                    </Typography>
                    <Typography variant="small" color="gray">
                        Terakhir Diubah: {formatToDateTime(booking.updatedAt)}
                    </Typography>
                </CardFooter>
            </Card>
        </div>
    );
}
