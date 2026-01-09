"use client";

import {createColumnHelper} from "@tanstack/react-table";
import React, {useState} from "react";
import {formatToDateTime, formatToIDR, formatToMonthYear} from "@/app/_lib/util";
import {TableContent} from "@/app/_components/pageContent/TableContent";
import {useHeader} from "@/app/_context/HeaderContext";
import {Prisma} from "@prisma/client";
import {BillIncludeAll, BillIncludeBookingAndPayments} from "@/app/_db/bills";
import {BillForm} from "@/app/(internal)/(dashboard_layout)/bills/form";
import {
    createBillItemAction,
    deleteBillAction,
    deleteBillItemAction,
    sendBillEmailAction,
    updateBillItemAction,
    upsertBillAction
} from "@/app/(internal)/(dashboard_layout)/bills/bill-action";
import Link from "next/link";
import {
    Button,
    Chip,
    Dialog,
    DialogBody,
    DialogFooter,
    DialogHeader,
    Input,
    Typography
} from "@material-tailwind/react";
import {useMutation, UseMutationResult} from "@tanstack/react-query";
import {MdClose, MdDelete, MdEdit, MdEmail, MdSave} from "react-icons/md";
import {toast} from "react-toastify";
import {BillPageQueryParams} from "@/app/(internal)/(dashboard_layout)/bills/page";
import CurrencyInput from "@/app/_components/input/currencyInput";


// Add type for chip props
type ChipColor = "green" | "amber" | "red";
type ChipVariant = "gradient";

export interface BillsContentProps {
    bills: BillIncludeAll[]
    queryParams?: BillPageQueryParams
}

export default function BillsContent({bills, queryParams}: BillsContentProps) {
    const headerContext = useHeader();
    let [dataState, setDataState] = useState<typeof bills>(bills);
    let [showDialog, setShowDialog] = useState(false);
    let [dialogContent, setDialogContent] = useState(<></>);
    let [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
    let [confirmationDialogContent, setConfirmationDialogContent] = useState({title: "", body: ""});
    let [onConfirm, setOnConfirm] = useState(() => () => {
    });
    let [onCancel, setOnCancel] = useState(() => () => {
    });

    const sendBillEmailMutation = useMutation({
        mutationFn: sendBillEmailAction,
        onSuccess: (resp) => {
            if (resp.success) {
                toast.success("Email telah dikirim!");
            } else {
                toast.error("Email gagal dikirim!");
            }
            setShowDialog(false);
        }
    });

    const handleUpsert = async (data: any) => {
        try {
            const result = await upsertBillAction(data);
            return result;
        } catch (e: any) {
            toast.error(e.message || "Gagal menyimpan perubahan.");
            throw e;
        }
    };

    const handleDelete = (data: number) => {
        return new Promise((resolve, reject) => {
            setConfirmationDialogContent({
                title: "Konfirmasi Hapus",
                body: "Menghapus tagihan ini akan menghapus tagihan dan item tagihan, serta menghapus alokasi pembayaran yang terkait. Pembayaran dan transaksi pendapatan akan tetap ada. Tindakan ini tidak dapat dibatalkan. Harap pastikan Anda benar-benar ingin menghapus tagihan ini."
            });
            setOnConfirm(() => async () => {
                try {
                    const result = await deleteBillAction(data);
                    resolve(result);
                } catch (e: any) {
                    toast.error(e.message || "Gagal menghapus tagihan.");
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

    const handleBillUpdate = (updatedBill: BillIncludeAll) => {
        setDataState(prevBills =>
            prevBills.map(bill =>
                bill.id === updatedBill.id ? updatedBill : bill
            )
        );
    };

    const columnHelper = createColumnHelper<typeof bills[0]>();
    const columns = [
        columnHelper.accessor(row => row.id, {
            id: "id",
            header: "ID",
            enableColumnFilter: true,
            size: 20,
            meta: {filterType: "enumMulti"},
        }),
        columnHelper.accessor(row => row.bookings?.id, {
            id: "booking_id",
            header: "ID Pemesanan",
            enableColumnFilter: true,
            meta: {filterType: "enumMulti"},
            cell: (row) => `#-${row.getValue()}`
        }),
        columnHelper.accessor(row => row.bookings?.rooms?.room_number, {
            id: "room_number",
            header: "Nomor Kamar",
            enableColumnFilter: true,
            meta: {filterType: "enumMulti"},
        }),
        columnHelper.accessor(row => row.bookings?.tenants?.name, {
            id: "tenant_name",
            header: "Nama Penyewa",
            enableColumnFilter: true,
            meta: {filterType: "enumMulti"},
        }),
        columnHelper.accessor(row => row.description, {
            header: "Deskripsi",
            minSize: 275,
            enableColumnFilter: true,
            meta: {filterType: "enumMulti"},
        }),
        columnHelper.accessor(row =>
            row.bill_item
                .map(bi => bi.amount)
                .reduce((prevSum, bi) => new Prisma.Decimal(bi).add(prevSum), new Prisma.Decimal(0)
                ).toNumber(), {
            header: "Jumlah",
            enableColumnFilter: true,
            meta: {filterType: "currencyRange"},
            cell: props => formatToIDR(props.getValue())
        }),
        columnHelper.accessor(row => {
            if (row.paymentBills) {
                return row.paymentBills?.map(pb => new Prisma.Decimal(pb.amount).toNumber()).reduce((sum, curr) => sum + curr, 0);
            }
            return 0;
        }, {
            header: "Jumlah Terbayar",
            enableColumnFilter: true,
            meta: {filterType: "currencyRange"},
            cell: props => formatToIDR(props.getValue())
        }),
        columnHelper.accessor(row => {
            const totalAmount = row.bill_item
                .map(bi => bi.amount)
                .reduce((prevSum, bi) => new Prisma.Decimal(bi).add(prevSum), new Prisma.Decimal(0))
                .toNumber()
                .toFixed(0);

            const totalPaid = row.paymentBills
                ?.map(pb => new Prisma.Decimal(pb.amount).toNumber())
                .reduce((sum, curr) => sum + curr, 0)
                .toFixed(0) ?? 0;

            if (Number(totalPaid) >= Number(totalAmount)) return "paid";
            if (Number(totalPaid) > 0) return "partial";
            return "unpaid";
        }, {
            id: "payment_status",
            header: "Status Pembayaran",
            enableColumnFilter: true,
            meta: {filterType: "enumMulti"},
            cell: props => {
                const status = props.getValue();
                const chipProps = {
                    paid: {
                        value: "Lunas",
                        color: "green" as ChipColor,
                        variant: "gradient" as ChipVariant
                    },
                    partial: {
                        value: "Sebagian",
                        color: "amber" as ChipColor,
                        variant: "gradient" as ChipVariant
                    },
                    unpaid: {
                        value: "Belum Lunas",
                        color: "red" as ChipColor,
                        variant: "gradient" as ChipVariant
                    }
                }[status];

                return (
                    <Chip
                        value={chipProps.value}
                        color={chipProps.color}
                        variant={chipProps.variant}
                        size="sm"
                        className="font-medium w-fit"
                    />
                );
            },
        }),
        columnHelper.display({
            header: "Rincian Tagihan",
            cell: props => (
                <Link
                    className="text-blue-500 hover:underline"
                    onClick={() => {
                        setDialogContent(
                            <DetailsDialogContent
                                activeData={props.row.original}
                                setShowDialog={setShowDialog}
                                onBillUpdate={handleBillUpdate}
                            />
                        );
                        setShowDialog(true);
                    }}
                    href={{}}
                >
                    Lihat Rincian
                </Link>
            ),
        }),
        columnHelper.accessor(row => formatToMonthYear(row.due_date), {
            id: "due_date",
            header: () => null,
            cell: () => null,
            enableColumnFilter: false,
        }),
    ];

    if (!headerContext.locationID) {
        // @ts-ignore
        columns.splice(1, 0, columnHelper.accessor(row => row.bookings?.rooms?.locations?.name ?? "", {
                header: "Lokasi",
                size: 20,
                meta: {filterType: "enumMulti"},
            })
        );
    }

    return (
        <>
            <TableContent<typeof bills[0]>
                name={"Pemesanan"}
                initialContents={dataState}
                columns={columns}
                groupByOptions={[
                    {value: 'booking_id', label: 'Kelompokkan per Pemesanan'},
                    {value: 'due_date', label: 'Kelompokkan per Bulan', defaultSelected: true}
                ]}
                form={
                    // @ts-expect-error
                    <BillForm/>
                }
                searchPlaceholder={"TODO!"} // TODO!
                queryParams={
                    (queryParams?.action == undefined || queryParams?.action == "search") ? {
                        action: "search",
                        values: queryParams,
                    } : undefined
                }
                persistFiltersToUrl
                // TODO! Data should refresh on CRUD
                upsert={{
                    // @ts-expect-error
                    mutationFn: handleUpsert,
                }}
                delete={{
                    // @ts-expect-error
                    mutationFn: handleDelete,
                }}
                additionalActions={{
                    position: "before",
                    actions: [
                        {
                            generateButton: (rowData) => {
                                return (
                                    <MdEmail
                                        key={`${rowData.id}_email`}
                                        className="h-5 w-5 cursor-pointer hover:text-blue-500"
                                        onClick={() => {
                                            setDialogContent(
                                                <EmailConfirmationDialog
                                                    activeData={rowData}
                                                    sendBillEmailMutation={sendBillEmailMutation}
                                                    setShowDialog={setShowDialog}
                                                />
                                            );
                                            setShowDialog(true);
                                        }}/>
                                );
                            }
                        }
                    ]
                }}
                customDialog={
                    <>
                        {/*@ts-expect-error weird react 19 types error*/}
                        <Dialog
                            open={showDialog}
                            size={"lg"}
                            handler={() => setShowDialog(prev => !prev)}
                            className={"p-8"}
                        >
                            {dialogContent}
                        </Dialog>
                        {/*@ts-expect-error weird react 19 types error*/}
                        <Dialog
                            key={"confirmation-dialog"}
                            open={showConfirmationDialog}
                            handler={() => setShowConfirmationDialog(prev => !prev)}
                            className={"p-4"}
                        >
                            {/*@ts-expect-error weird react 19 types error*/}
                            <DialogHeader>{confirmationDialogContent.title}</DialogHeader>
                            {/*@ts-expect-error weird react 19 types error*/}
                            <DialogBody>
                                {/*@ts-expect-error weird react 19 types error*/}
                                <Typography>{confirmationDialogContent.body}</Typography>
                            </DialogBody>
                            {/*@ts-expect-error weird react 19 types error*/}
                            <DialogFooter>
                                {/*@ts-expect-error weird react 19 types error*/}
                                <Button
                                    variant="text"
                                    color="red"
                                    onClick={onCancel}
                                    className="mr-1"
                                >
                                    <span>Batal</span>
                                </Button>
                                {/*@ts-expect-error weird react 19 types error*/}
                                <Button variant="gradient" color="green" onClick={onConfirm}>
                                    <span>Konfirmasi</span>
                                </Button>
                            </DialogFooter>
                        </Dialog>
                    </>
                }
                searchType={undefined}
                filterByOptions={{
                    columnId: 'payment_status',
                    options: [
                        {value: 'paid', label: 'Lunas'},
                        {value: 'partial', label: 'Sebagian'},
                        {value: 'unpaid', label: 'Belum Lunas'},
                    ],
                    allLabel: 'Semua',
                }}
                valueLabelMapping={{
                    payment_status: {
                        'paid': 'Lunas',
                        'partial': 'Sebagian',
                        'unpaid': 'Belum Lunas'
                    }
                }}
            />
        </>
    );
}

const DetailsDialogContent = ({activeData, setShowDialog, onBillUpdate}: {
    activeData: BillIncludeAll;
    setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
    onBillUpdate: (updatedBill: BillIncludeAll) => void;
}) => {
    const [editingBillItem, setEditingBillItem] = useState<number | null>(null);
    const [addingNewBillItem, setAddingNewBillItem] = useState(false);
    const [currentBillData, setCurrentBillData] = useState<BillIncludeAll>(activeData);

    // State for form data
    const [newBillItemData, setNewBillItemData] = useState({
        description: "",
        amount: 0
    });

    const [editingBillItemData, setEditingBillItemData] = useState<{
        [key: number]: { description: string; amount: number }
    }>({});

    const updateBillItemMutation = useMutation({
        mutationFn: updateBillItemAction,
        onSuccess: (resp) => {
            if (resp.success && resp.success.bill) {
                const updatedBill = resp.success.bill as BillIncludeAll;
                setCurrentBillData(updatedBill);
                onBillUpdate(updatedBill);
                setEditingBillItem(null);
                toast.success("Rincian tagihan berhasil diperbarui!");
            } else {
                toast.error(resp.failure || "Gagal memperbarui rincian tagihan!");
            }
        }
    });

    const deleteBillItemMutation = useMutation({
        mutationFn: deleteBillItemAction,
        onSuccess: (resp) => {
            if (resp.success && resp.success.bill) {
                const updatedBill = resp.success.bill as BillIncludeAll;
                setCurrentBillData(updatedBill);
                onBillUpdate(updatedBill);
                toast.success("Rincian tagihan berhasil dihapus!");
            } else {
                toast.error(resp.failure || "Gagal menghapus rincian tagihan!");
            }
        }
    });

    const createBillItemMutation = useMutation({
        mutationFn: createBillItemAction,
        onSuccess: (resp) => {
            if (resp.success && resp.success.bill) {
                const updatedBill = resp.success.bill as BillIncludeAll;
                setCurrentBillData(updatedBill);
                onBillUpdate(updatedBill);
                setAddingNewBillItem(false);
                toast.success("Rincian tagihan berhasil ditambahkan!");
            } else {
                toast.error(resp.failure || "Gagal menambahkan rincian tagihan!");
            }
        }
    });

    const handleUpdateBillItem = async (data: any) => {
        await updateBillItemMutation.mutateAsync(data);
    };

    const handleDeleteBillItem = async (id: number) => {
        if (confirm("Apakah Anda yakin ingin menghapus rincian tagihan ini?")) {
            await deleteBillItemMutation.mutateAsync(id);
        }
    };

    const handleCreateBillItem = async (data: any) => {
        await createBillItemMutation.mutateAsync({
            ...data,
            bill_id: currentBillData.id
        });
    };

    const handleStartEdit = (item: any) => {
        setEditingBillItem(item.id);
        setEditingBillItemData(prev => ({
            ...prev,
            [item.id]: {
                description: item.description,
                amount: new Prisma.Decimal(item.amount).toNumber()
            }
        }));
    };

    return (
        <>
            {/*@ts-expect-error weird react 19 types error*/}
            <Typography variant="h5" color="black" className="mb-4">Detail Tagihan dan Pembayaran</Typography>
            <div className="flex justify-between items-center mb-2">
                {/*@ts-expect-error weird react 19 types error*/}
                <Typography variant="h6" color="blue-gray">Rincian Tagihan</Typography>
                {/*@ts-expect-error weird react 19 types error*/}
                <Button
                    size="sm"
                    color="blue"
                    onClick={() => setAddingNewBillItem(true)}
                    disabled={addingNewBillItem}
                >
                    Tambah Rincian
                </Button>
            </div>

            <table className="w-full table-auto text-left mb-6">
                <thead>
                <tr>
                    {["Deskripsi", "Harga", "Aksi"].map((el) => (
                        <th key={el} className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                            {/*@ts-expect-error weird react 19 types error*/}
                            <Typography variant="small" color="blue-gray"
                                        className="font-normal leading-none opacity-70">
                                {el}
                            </Typography>
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {addingNewBillItem && (
                    <tr key="new-bill-item">
                        <td className="border-b border-blue-gray-50 p-4">
                            {/*@ts-expect-error weird react 19 types error*/}
                            <Input
                                type="text"
                                placeholder="Deskripsi"
                                value={newBillItemData.description}
                                className="!border !border-gray-300 bg-white text-gray-900 shadow-lg shadow-gray-900/5 ring-4 ring-transparent placeholder:text-gray-500 focus:!border-gray-900 focus:!border-t-gray-900 focus:ring-gray-900/10"
                                labelProps={{className: "hidden"}}
                                containerProps={{className: "min-w-[100px]"}}
                                onChange={(e) => setNewBillItemData(prev => ({...prev, description: e.target.value}))}
                            />
                        </td>
                        <td className="border-b border-blue-gray-50 p-4">
                            <CurrencyInput
                                placeholder="0"
                                value={newBillItemData.amount}
                                className="!border !border-gray-300 bg-white text-gray-900 shadow-lg shadow-gray-900/5 ring-4 ring-transparent placeholder:text-gray-500 focus:!border-gray-900 focus:!border-t-gray-900 focus:ring-gray-900/10"
                                labelProps={{className: "hidden"}}
                                containerProps={{className: "min-w-[100px]"}}
                                setValue={(value) => setNewBillItemData(prev => ({...prev, amount: value || 0}))}
                            />
                        </td>
                        <td className="border-b border-blue-gray-50 p-4">
                            <div className="flex gap-2">
                                <MdSave
                                    className="h-5 w-5 cursor-pointer hover:text-green-500"
                                    onClick={async () => {
                                        if (newBillItemData.description.trim() && newBillItemData.amount > 0) {
                                            await handleCreateBillItem({
                                                description: newBillItemData.description.trim(),
                                                amount: newBillItemData.amount,
                                                internal_description: ""
                                            });
                                            // Reset form data after successful creation
                                            setNewBillItemData({description: "", amount: 0});
                                        } else {
                                            toast.error("Deskripsi dan jumlah harus diisi!");
                                        }
                                    }}
                                    style={{opacity: createBillItemMutation.isPending ? 0.5 : 1}}
                                />
                                <MdClose
                                    className="h-5 w-5 cursor-pointer hover:text-gray-500"
                                    onClick={() => {
                                        setAddingNewBillItem(false);
                                        setNewBillItemData({description: "", amount: 0});
                                    }}
                                />
                            </div>
                        </td>
                    </tr>
                )}
                {
                    currentBillData.bill_item && currentBillData.bill_item.length > 0 ?
                        currentBillData.bill_item.map((item, index) => (
                            <tr key={item.id}>
                                <td className="border-b border-blue-gray-50 p-4">
                                    {editingBillItem === item.id ? (
                                        // @ts-expect-error weird react 19 types error
                                        <Input
                                            type="text"
                                            placeholder="Deskripsi"
                                            value={editingBillItemData[item.id]?.description || ""}
                                            className="!border !border-gray-300 bg-white text-gray-900 shadow-lg shadow-gray-900/5 ring-4 ring-transparent placeholder:text-gray-500 focus:!border-gray-900 focus:!border-t-gray-900 focus:ring-gray-900/10"
                                            labelProps={{className: "hidden"}}
                                            containerProps={{className: "min-w-[100px]"}}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                setEditingBillItemData(prev => ({
                                                    ...prev,
                                                    [item.id]: {
                                                        ...prev[item.id],
                                                        description: e.target.value
                                                    }
                                                }));
                                            }}
                                        />
                                    ) : (
                                        // @ts-expect-error weird react 19 types error
                                        <Typography variant="small" color="blue-gray" className="font-normal">
                                            {item.description}
                                        </Typography>
                                    )}
                                </td>
                                <td className="border-b border-blue-gray-50 p-4">
                                    {editingBillItem === item.id ? (
                                        <CurrencyInput
                                            placeholder="0"
                                            value={editingBillItemData[item.id]?.amount || 0}
                                            className="!border !border-gray-300 bg-white text-gray-900 shadow-lg shadow-gray-900/5 ring-4 ring-transparent placeholder:text-gray-500 focus:!border-gray-900 focus:!border-t-gray-900 focus:ring-gray-900/10"
                                            labelProps={{className: "hidden"}}
                                            containerProps={{className: "min-w-[100px]"}}
                                            setValue={(value) => {
                                                setEditingBillItemData(prev => ({
                                                    ...prev,
                                                    [item.id]: {
                                                        ...prev[item.id],
                                                        amount: value || 0
                                                    }
                                                }));
                                            }}
                                        />
                                    ) : (
                                        // @ts-expect-error weird react 19 types error
                                        <Typography variant="small" color="blue-gray" className="font-normal">
                                            {formatToIDR(new Prisma.Decimal(item.amount).toNumber())}
                                        </Typography>
                                    )}
                                </td>
                                <td className="border-b border-blue-gray-50 p-4">
                                    <div className="flex gap-2">
                                        {editingBillItem === item.id ? (
                                            <>
                                                <MdSave
                                                    className="h-5 w-5 cursor-pointer hover:text-green-500"
                                                    onClick={async () => {
                                                        const editData = editingBillItemData[item.id];
                                                        if (editData && editData.description.trim() && editData.amount > 0) {
                                                            await handleUpdateBillItem({
                                                                id: item.id,
                                                                description: editData.description.trim(),
                                                                amount: editData.amount,
                                                                internal_description: item.internal_description
                                                            });
                                                        } else {
                                                            toast.error("Deskripsi dan jumlah harus diisi!");
                                                        }
                                                    }}
                                                    style={{opacity: updateBillItemMutation.isPending ? 0.5 : 1}}
                                                />
                                                <MdClose
                                                    className="h-5 w-5 cursor-pointer hover:text-gray-500"
                                                    onClick={() => {
                                                        setEditingBillItem(null);
                                                        setEditingBillItemData(prev => {
                                                            const newData = {...prev};
                                                            delete newData[item.id];
                                                            return newData;
                                                        });
                                                    }}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <MdEdit
                                                    className="h-5 w-5 cursor-pointer hover:text-blue-500"
                                                    onClick={() => handleStartEdit(item)}
                                                    style={{opacity: editingBillItem !== null ? 0.5 : 1}}
                                                />
                                                <MdDelete
                                                    className="h-5 w-5 cursor-pointer hover:text-red-500"
                                                    onClick={() => handleDeleteBillItem(item.id)}
                                                    style={{opacity: deleteBillItemMutation.isPending ? 0.5 : 1}}
                                                />
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )) :
                        <tr>
                            <td colSpan={3} className="p-4">
                                {/*@ts-expect-error weird react 19 types error*/}
                                <Typography>Tidak ada rincian tagihan.</Typography>
                            </td>
                        </tr>
                }
                </tbody>
            </table>

            {(addingNewBillItem || editingBillItem !== null) && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd"
                                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                      clipRule="evenodd"/>
                            </svg>
                        </div>
                        <div className="ml-3">
                            {/*@ts-expect-error weird react 19 types error*/}
                            <Typography variant="h6" color="amber" className="font-medium text-amber-800">
                                Peringatan Alokasi Pembayaran
                            </Typography>
                            {/*@ts-expect-error weird react 19 types error*/}
                            <Typography variant="small" color="amber" className="mt-1 text-amber-700">
                                Mengubah atau menambah rincian tagihan dapat mempengaruhi alokasi pembayaran yang sudah
                                ada.
                                Harap periksa kembali alokasi pembayaran setelah menyimpan perubahan ini.
                            </Typography>
                        </div>
                    </div>
                </div>
            )}

            {/*@ts-expect-error weird react 19 types error*/}
            <Typography variant="h6" color="blue-gray" className="mb-2">Pembayaran</Typography>
            <table className="w-full table-auto text-left">
                <thead>
                <tr>
                    {["ID", "Tanggal", "Jumlah Pembayaran", "Pembayaran yang Dialokasikan", ""].map((el) => (
                        <th key={el} className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                            {/*@ts-expect-error weird react 19 types error*/}
                            <Typography variant="small" color="blue-gray"
                                        className="font-normal leading-none opacity-70">
                                {el}
                            </Typography>
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {
                    currentBillData.paymentBills && currentBillData.paymentBills.length > 0 ?
                        currentBillData.paymentBills.map((pb, index) => (
                            <tr key={pb.payment.id}>
                                <td className="border-b border-blue-gray-50 p-4">
                                    {/*@ts-expect-error weird react 19 types error*/}
                                    <Typography variant="small" color="blue-gray" className="font-normal">
                                        {pb.payment.id}
                                    </Typography>
                                </td>
                                <td className="border-b border-blue-gray-50 p-4">
                                    {/*@ts-expect-error weird react 19 types error*/}
                                    <Typography variant="small" color="blue-gray" className="font-normal">
                                        {formatToDateTime(pb.payment.payment_date)}
                                    </Typography>
                                </td>
                                <td className="border-b border-blue-gray-50 p-4">
                                    {/*@ts-expect-error weird react 19 types error*/}
                                    <Typography variant="small" color="blue-gray" className="font-normal">
                                        {formatToIDR(new Prisma.Decimal(pb.payment.amount).toNumber())}
                                    </Typography>
                                </td>
                                <td className="border-b border-blue-gray-50 p-4">
                                    {/*@ts-expect-error weird react 19 types error*/}
                                    <Typography variant="small" color="blue-gray" className="font-normal">
                                        {formatToIDR(new Prisma.Decimal(pb.amount).toNumber())}
                                    </Typography>
                                </td>
                                <td className="border-b border-blue-gray-50 p-4">
                                    <Link
                                        href={{
                                            pathname: "/payments",
                                            query: {
                                                id: pb.payment.id,
                                            }
                                        }}
                                        className="font-normal"
                                    >
                                        {/*@ts-expect-error weird react 19 types error*/}
                                        <Typography variant="small" color="blue-gray" className="font-normal">
                                            {"Info Lebih Lanjut"}
                                        </Typography>
                                    </Link>
                                </td>
                            </tr>
                        )) :
                        <tr>
                            <td colSpan={5} className="p-4">
                                {/*@ts-expect-error weird react 19 types error*/}
                                <Typography>Tidak ada pembayaran yang telah dilakukan</Typography>
                            </td>
                        </tr>
                }
                </tbody>
            </table>

            <div className="flex gap-x-4 justify-end">
                {/*@ts-expect-error weird react 19 types error*/}
                <Button onClick={() => setShowDialog(false)} variant="outlined" className="mt-6">
                    Tutup
                </Button>
            </div>
        </>
    );
};

const EmailConfirmationDialog = ({activeData, sendBillEmailMutation, setShowDialog}: {
    activeData: BillIncludeBookingAndPayments;
    sendBillEmailMutation: UseMutationResult<{ failure: string, success?: undefined } | {
        success: string,
        failure?: undefined
    }, Error, number, unknown>
    setShowDialog: React.Dispatch<React.SetStateAction<boolean>>
}) => {
    return (
        <>
            {/*@ts-expect-error weird react 19 types error*/}
            <Typography variant="h5" color="black" className="mb-4">Kirim Pengingat Tagihan</Typography>
            {/*@ts-expect-error weird react 19 types error*/}
            <Typography variant="paragraph" color="black">Apakah anda mau mengirimkan email ini?</Typography>
            <div className={"flex gap-x-4 justify-end"}>
                {/*@ts-expect-error weird react 19 types error*/}
                <Button onClick={() => setShowDialog(false)} variant={"outlined"} className="mt-6">
                    Tutup
                </Button>
                {/*@ts-expect-error weird react 19 types error*/}
                <Button
                    onClick={(e) => {
                        e.currentTarget.disabled = true;
                        if (activeData) {
                            sendBillEmailMutation.mutate(activeData.id);
                        }
                    }}
                    color={"blue"}
                    className="mt-6"
                    loading={sendBillEmailMutation.isPending}
                >
                    Kirim
                </Button>
            </div>
        </>
    );
};
