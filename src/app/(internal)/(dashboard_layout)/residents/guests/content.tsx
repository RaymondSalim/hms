"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React, {useRef, useState} from "react";
import {formatToDateTime, formatToIDR} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {GuestIncludeAll} from "@/app/_db/guest";
import {GuestForm} from "@/app/(internal)/(dashboard_layout)/residents/guests/form";
import {
    deleteGuestAction,
    deleteGuestStayAction,
    upsertGuestAction,
    upsertGuestStayAction
} from "@/app/(internal)/(dashboard_layout)/residents/guests/guest-action";
import Link from "next/link";
import {HiOutlineDotsVertical} from "react-icons/hi";
import {
    Button,
    Card,
    CardBody,
    CardFooter,
    Dialog,
    Input,
    Menu,
    MenuHandler,
    MenuItem,
    MenuList,
    Popover,
    PopoverContent,
    PopoverHandler,
    Typography
} from "@material-tailwind/react";
import {FaCheck, FaEnvelope, FaPhone, FaX} from "react-icons/fa6";
import {GuestStay, Prisma} from "@prisma/client";
import CurrencyInput from "@/app/_components/input/currencyInput";
import {MdAdd, MdDelete, MdEdit} from "react-icons/md";
import {useMutation} from "@tanstack/react-query";
import {toast, ToastOptions} from "react-toastify";
import {DatePicker} from "@/app/_components/DateRangePicker";


export interface GuestsContentProps {
    guests: GuestIncludeAll[]
}

export default function GuestsContent({guests}: GuestsContentProps) {
    const columnHelper = createColumnHelper<GuestIncludeAll>();
    const columns = [
        columnHelper.accessor(row => row.id, {
            header: "ID",
            size: 20
        }),
        columnHelper.accessor(row => row.name, {
            header: "Nama"
        }),
        columnHelper.accessor(row => row.email, {
            header: "Alamat Email"
        }),
        columnHelper.accessor(row => row.booking.tenants?.name, {
            header: "Tamu Dari",
            cell: props => {
                return (
                    <Link href={{
                        pathname: "/residents/tenants",
                        query: {
                            tenant_id: props.cell.row.original.booking.tenants?.id,
                        }
                    }}>{props.cell.getValue()}</Link>
                );
            }
        }),
        columnHelper.accessor(row => row.createdAt, {
            header: "Dibuat Pada",
            cell: props => formatToDateTime(props.cell.getValue())
        }),
    ];

    let [dialogContent, setDialogContent] = useState(<></>);
    let [showDialog, setShowDialog] = useState(false);

    const dialogRef = useRef<HTMLDivElement>(null);

    return (
        <TableContent<GuestIncludeAll>
            name={"Tamu"}
            initialContents={guests}
            columns={columns}
            form={
                // @ts-ignore
                <GuestForm/>
            }
            searchPlaceholder={"Cari berdasarkan nama atau alamat"}
            upsert={{
                mutationFn: upsertGuestAction,
            }}

            delete={{
                // @ts-ignore
                mutationFn: deleteGuestAction,
            }}
            customDialog={
                <Dialog
                    open={showDialog}
                    size={"lg"}
                    handler={() => setShowDialog(prev => {
                        const targetElement = document.getElementsByClassName(".Toastify");
                        if (targetElement?.item(0)?.childElementCount && targetElement?.item(0)?.childElementCount! > 1) {
                            return prev;
                        }
                        return !prev;
                    })}
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
            }
            additionalActions={{
                position: "before",
                actions: [
                    {
                        generateButton: rowData => {
                            return (
                                <Menu placement="bottom-end">
                                    <MenuHandler>
                                        <Button variant={"text"} className={"p-0 hover:bg-transparent"}>
                                            <HiOutlineDotsVertical
                                                className="h-5 w-5 cursor-pointer text-gray-700 hover:text-blue-500"
                                            />
                                        </Button>
                                    </MenuHandler>
                                    <MenuList>
                                        <MenuItem onClick={() => {
                                            setDialogContent(<GuestInfo guest={rowData}/>);
                                            setShowDialog(true);
                                        }}>
                                            Lihat Selengkapnya
                                        </MenuItem>
                                    </MenuList>
                                </Menu>

                            );
                        }
                    },
                ]
            }}
        />
    );
}

interface GuestInfoProps {
    guest: GuestIncludeAll
}

export function GuestInfo({guest}: GuestInfoProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editedStays, setEditedStays] = useState<Partial<GuestStay>[]>([...guest.GuestStay]);
    const [showDialog, setShowDialog] = useState(false);
    const [selectedStay, setSelectedStay] = useState<Partial<GuestStay> | null>(null);

    const [popoverOpenMap, setPopoverOpenMap] = useState<Record<string, boolean>>({});

    const togglePopover = (index: string, forceOpen?: boolean) => {
        setPopoverOpenMap((prev) => ({
            ...prev,
            [index]: forceOpen != undefined ? forceOpen : !prev[index],
        }));
    };
    
    const today = new Date();
    
    const toastSettings: ToastOptions = {
        closeButton: false,
        onClick: (e) => {
            e.preventDefault();
        }
    };

    const upsertGuestStayMutation = useMutation({
        mutationFn: upsertGuestStayAction,
        onSuccess: (resp) => {
            if (resp.success) {
                toast.success("Penginapan Tamu Telah Disimpan!", toastSettings);
                setEditingIndex(null);
            } else {
                toast.error("Gagal Menyimpan Penginapan Tamu.", toastSettings);
            }
        },
        onError: () => toast.error("Telah terjadi kesalahan."),
    });

    const deleteGuestStayMutation = useMutation({
        mutationFn: deleteGuestStayAction,
        onSuccess: (resp) => {
            if (resp.success) {
                toast.success("Penginapan Tamu Telah Dihapus!", toastSettings);
                setEditedStays(editedStays.filter(stay => stay.id !== selectedStay?.id));
                setShowDialog(false);
            } else {
                toast.error("Gagal Menghapus Penginapan Tamu.", toastSettings);
            }
        },
        onError: () => toast.error("Telah terjadi kesalahan."),
    });

    const handleEditClick = (index: number) => {
        setEditingIndex(index);
    };

    const handleDeleteClick = (stay: Partial<GuestStay>) => {
        setSelectedStay(stay);
        setShowDialog(true);
    };

    const handleSaveClick = async (index: number) => {
        await upsertGuestStayMutation.mutateAsync(editedStays[index]);
    };

    const handleCancelClick = () => {
        setEditedStays([...guest.GuestStay]);
        setEditingIndex(null);
    };

    const handleConfirmDelete = async () => {
        if (selectedStay?.id) {
            await deleteGuestStayMutation.mutateAsync(selectedStay.id);
        }
    };

    const handleAddGuestStay = () => {
        const newStay: Partial<GuestStay> = {
            start_date: new Date(),
            end_date: new Date(),
            daily_fee: new Prisma.Decimal(0),
            guest_id: guest.id,
        };
        setEditedStays([...editedStays, newStay]);
        setEditingIndex(editedStays.length);
    };

    return (
        <Card className="p-0 *:px-0 shadow-none flex flex-col h-full">
            <h1 className="text-xl font-semibold text-black">Informasi Tamu</h1>
            <CardBody className="space-y-6 flex-grow">

                {/* Guest Profile */}
                <div className="flex items-center gap-4 border-b pb-4">
                    <div>
                        <Typography variant="h5" className="font-semibold">{guest.name}</Typography>
                        <Typography variant="small" color="gray">
                            Tamu dari:{" "}
                            {guest.booking.tenants ? (
                                <Link
                                    href={{pathname: "/residents/tenants", query: {tenant_id: guest.booking.tenant_id}}}
                                    className="text-blue-500 underline"
                                >
                                    {guest.booking.tenants.name}
                                </Link>
                            ) : (
                                "Tidak diketahui"
                            )}
                        </Typography>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                        <FaEnvelope className="text-gray-600"/>
                        <Typography>{guest.email || "N/A"}</Typography>
                    </div>
                    <div className="flex items-center gap-2">
                        <FaPhone className="text-gray-600"/>
                        <Typography>{guest.phone || "N/A"}</Typography>
                    </div>
                </div>

                {/* Guest Stay Information */}
                <div className="mt-6">
                    <Typography variant="h6" className="font-semibold">Riwayat Menginap</Typography>
                    {
                        editedStays.length > 0 ? (
                            <div className="overflow-x-auto mt-2">
                                <table className="w-full table-auto border-collapse border border-gray-300">
                                    <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 px-4 py-2 text-left">Tanggal Mulai</th>
                                        <th className="border border-gray-300 px-4 py-2 text-left">Tanggal Selesai</th>
                                        <th className="border border-gray-300 px-4 py-2 text-left">Biaya Harian</th>
                                        <th className="border border-gray-300 px-4 py-2 text-center">Aksi</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {editedStays.map((stay, index) => (
                                        <tr key={index}>
                                            <td className="border border-gray-300 px-4 py-2">
                                                {editingIndex === index ? (
                                                                                                            <DatePicker
                                                        mode="single"
                                                        placeholder=""
                                                        showSearchButton={false}
                                                        onUpdate={(data) => {
                                                            if (data.singleDate) {
                                                                const newStays = [...editedStays];
                                                                newStays[index].start_date = data.singleDate;
                                                                setEditedStays(newStays);
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    stay.start_date ? formatToDateTime(stay.start_date, false) : "-"
                                                )}
                                            </td>

                                            <td className="border border-gray-300 px-4 py-2">
                                                {editingIndex === index ? (
                                                    <DatePicker
                                                        mode="single"
                                                        placeholder=""
                                                        showSearchButton={false}
                                                        onUpdate={(data) => {
                                                            if (data.singleDate) {
                                                                const newStays = [...editedStays];
                                                                newStays[index].end_date = data.singleDate;
                                                                setEditedStays(newStays);
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    stay.end_date ? formatToDateTime(stay.end_date, false) : "-"
                                                )}
                                            </td>

                                            <td className="border border-gray-300 px-4 py-2">
                                                {editingIndex === index ? (
                                                    <CurrencyInput
                                                        containerProps={{
                                                            className: "w-28 !min-w-28"
                                                        }}
                                                        labelProps={{
                                                            className: "before:content-none after:content-none",
                                                        }}
                                                        className={`${false ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                                        value={stay.daily_fee ? new Prisma.Decimal(stay.daily_fee)?.toNumber() : undefined}
                                                        setValue={newValue => {
                                                            const newStays = [...editedStays];
                                                            newStays[index].daily_fee = newValue ? new Prisma.Decimal(newValue) : undefined;
                                                            setEditedStays(newStays);
                                                        }}
                                                    />
                                                ) : (
                                                    stay.daily_fee ? formatToIDR(new Prisma.Decimal(stay.daily_fee).toNumber()) : "-"
                                                )}
                                            </td>

                                            {/* Action Buttons */}
                                            <td className="border border-gray-300 px-4 py-2">
                                                <div
                                                    className={"flex gap-x-4 items-center justify-center"}
                                                >
                                                    {editingIndex === index ? (
                                                        <>
                                                            <FaCheck
                                                                data-action={"confirm"}
                                                                className="h-5 w-5 cursor-pointer text-gray-700 hover:text-green-500"
                                                                onClick={() => handleSaveClick(index)}
                                                            />
                                                            <FaX
                                                                data-action={"cancel"}
                                                                className="h-5 w-5 cursor-pointer text-gray-700 hover:text-red-500"
                                                                onClick={handleCancelClick}
                                                            />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <MdEdit
                                                                data-action={"edit"}
                                                                onClick={() => handleEditClick(index)}
                                                                className="h-5 w-5 cursor-pointer text-gray-700 hover:text-blue-500"
                                                            />
                                                            <MdDelete
                                                                data-action={"delete"}
                                                                onClick={() => handleDeleteClick(stay)}
                                                                className="h-5 w-5 cursor-pointer text-gray-700 hover:text-red-500"
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <Typography className="text-gray-600 mt-4">Tidak ada riwayat menginap</Typography>
                        )}
                </div>

                <Button fullWidth color="green" className="mt-4 flex items-center justify-center" onClick={handleAddGuestStay}>
                    <MdAdd className="h-6 w-6"/>
                    <span className={"leading-loose"}>Tambah Menginap</span>
                </Button>
            </CardBody>

            {/* Sticky Footer */}
            <CardFooter divider className="flex items-center justify-between py-3 text-sm text-gray-600 mt-auto">
                <Typography>
                    Dibuat Pada: {formatToDateTime(guest.createdAt)}
                </Typography>
                <Typography>
                    Terakhir Diubah: {formatToDateTime(guest.updatedAt)}
                </Typography>
            </CardFooter>

            <Dialog open={showDialog} handler={setShowDialog}>
                <Card>
                    <CardBody className={"flex flex-col gap-4"}>
                        <Typography variant="h5">Konfirmasi Penghapusan</Typography>
                        <Typography>Apakah Anda yakin ingin menghapus riwayat menginap ini?</Typography>
                        <div className={"flex justify-end gap-x-4"}>
                            <Button color="black" variant={"outlined"} onClick={() => setShowDialog(false)}>Tutup</Button>
                            <Button color="red" onClick={handleConfirmDelete}>Hapus</Button>
                        </div>
                    </CardBody>
                </Card>
            </Dialog>
        </Card>
    );
}