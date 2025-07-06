"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React, {useState} from "react";
import {formatToDateTime, formatToIDR} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {useHeader} from "@/app/_context/HeaderContext";
import Link from "next/link";
import {
    checkInOutAction,
    deleteBookingAction,
    upsertBookingAction,
    UpsertBookingPayload
} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import {BookingForm} from "@/app/(internal)/(dashboard_layout)/bookings/form";
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
} from "@material-tailwind/react";
import {TbDoorEnter, TbDoorExit} from "react-icons/tb";
import {useMutation} from "@tanstack/react-query";
import {CheckInOutType} from "@/app/(internal)/(dashboard_layout)/bookings/enum";
import {BookingsIncludeAll} from "@/app/_db/bookings";
import {usePathname, useRouter} from "next/navigation";
import {BookingPageQueryParams} from "@/app/(internal)/(dashboard_layout)/bookings/page";
import {DepositStatus, Prisma} from "@prisma/client";
import {SelectOption} from "@/app/_components/input/select";
import {MdContentCopy} from "react-icons/md";
import {toast} from "react-toastify";
import CurrencyInput from "@/app/_components/input/currencyInput";


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

    const handleDelete = (data: any) => {
        return new Promise((resolve, reject) => {
            setConfirmationDialogContent({
                title: "Konfirmasi Hapus",
                body: "Menghapus pemesanan ini akan menyebabkan alokasi pembayaran yang ada dihitung ulang secara otomatis. Harap tinjau kembali alokasi pembayaran setelah menghapus."
            });
            setOnConfirm(() => async () => {
                try {
                    const result = await deleteBookingAction(data.id);
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
        const endDate = booking.end_date.toISOString().split('T')[0];

        // Set default date to today if within range, otherwise undefined
        if (today >= startDate && today <= endDate) {
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
        columnHelper.accessor(row => formatToDateTime(row.end_date, false), {
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
                                    const duplicatedBooking: Partial<UpsertBookingPayload> = {
                                        ...rest,
                                        // @ts-expect-error invalid type
                                        rooms: rowRooms?.location_id ? {
                                            location_id: rowRooms.location_id
                                        } : null,
                                        // @ts-expect-error id type undefined error
                                        addOns: rowData.addOns?.map(addon => ({
                                            ...addon,
                                            id: undefined,
                                            booking_id: undefined,
                                            createdAt: undefined,
                                            updatedAt: undefined
                                        })) ?? [],
                                    };
                                    // @ts-expect-error type
                                    setActiveContent(duplicatedBooking);
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
