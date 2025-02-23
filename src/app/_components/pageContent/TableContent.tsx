"use client";

import {
    CellContext,
    ColumnDef,
    createColumnHelper,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable
} from "@tanstack/react-table";
import {cloneElement, Dispatch, ReactElement, SetStateAction, useEffect, useMemo, useState} from "react";
import TanTable, {RowAction} from "@/app/_components/tanTable/tanTable";
import styles from "@/app/(internal)/(dashboard_layout)/data-center/locations/components/searchBarAndCreate.module.css";
import {Button, Dialog, IconButton, Input, Option, Select, Typography} from "@material-tailwind/react";
import {FaArrowLeft, FaArrowRight, FaPlus} from "react-icons/fa6";
import {
    DefaultError,
    MutationOptions,
    QueryObserverResult,
    RefetchOptions,
    useMutation,
    UseMutationResult
} from "@tanstack/react-query";
import {GenericActionsType} from "@/app/_lib/actions";
import {toast} from "react-toastify";
import {rankItem} from '@tanstack/match-sorter-utils';
import {FilterFn} from '@tanstack/table-core';

export interface TableFormProps<T> {
    contentData?: T
    setDialogOpen: (open: boolean) => void
    mutation: UseMutationResult<GenericActionsType<T>, DefaultError, Partial<T>>,
    mutationResponse?: GenericActionsType<T>
    fromQuery: boolean
}

interface CustomMutationOptions<
    OriginalT, TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown
> extends MutationOptions<TData, TError, TVariables> {
    customOnSuccess?: (
        data: TData, variables: TVariables, context: TContext,
        setMutationResponse: Dispatch<SetStateAction<TData | undefined>>,
        setContentsState: Dispatch<SetStateAction<OriginalT[]>>,
        setDialogOpen: Dispatch<SetStateAction<boolean>>
    ) => Promise<unknown> | unknown;
}

export interface TableContentProps<T extends { id: number | string }, _TReturn = GenericActionsType<T>> {
    name: string,
    initialContents: T[],
    initialSearchValue?: string,
    queryParams?: {
        initialActiveContent: T,
        clearQueryParams: () => void,
    }

    upsert: CustomMutationOptions<T, _TReturn, DefaultError, Partial<T>>,
    delete: CustomMutationOptions<T, _TReturn, DefaultError, string | number>,

    columns: ColumnDef<T, any>[],

    searchPlaceholder?: string,
    form: ReactElement<TableFormProps<T>>
    shouldShowRowAction?: (props: CellContext<T, unknown>) => boolean
    additionalActions?: {
        position?: "before" | "after";
        actions: {
            generateButton: (rowData: T) => ReactElement,
            mutationParam?: Object
        }[]
    }

    customDialog?: ReactElement
    refetchFn?: (options?: RefetchOptions) => Promise<QueryObserverResult<T[]>>
}

export function TableContent<T extends { id: number | string }>(props: TableContentProps<T>) {
    const [contentsState, setContentsState] = useState<T[]>(props.initialContents);
    const [searchValue, setSearchValue] = useState(props.initialSearchValue ?? "");
    const [activeContent, setActiveContent] = useState<T | undefined>(props.queryParams?.initialActiveContent);
    const [upsertMutationResponse, setUpsertMutationResponse] = useState<GenericActionsType<T> | undefined>(undefined);
    const [deleteMutationResponse, setDeleteMutationResponse] = useState<GenericActionsType<T> | undefined>(undefined);

    const [fromQuery, setFromQuery] = useState(false);

    const upsertContentMutation = useMutation({
        ...props.upsert,
        onSuccess: (data, variables, context) => {
            if (props.upsert.customOnSuccess) {
                props.upsert.customOnSuccess(data, variables, context, setUpsertMutationResponse, setContentsState, setDialogOpen);
            } else {
                setUpsertMutationResponse(data);
                let shouldCloseDialog = false;

                if (data.success) {
                    let target = data.success;

                    setContentsState(prevState => {
                        let newArr = [...prevState];
                        let index = newArr.findIndex(l => l.id == target?.id);
                        if (index == -1) {
                            return newArr.concat(target!);
                        } else {
                            newArr[index] = target!;
                        }
                        return newArr;
                    });
                    shouldCloseDialog = true;
                }

                if (shouldCloseDialog) {
                    setDialogOpen(false);
                    if (fromQuery) {
                        toast.success(`Pembaruan Berhasil!`);
                    } else {
                        toast.success(`Pembuatan Berhasil!`);
                    }
                }
            }
        }
    });

    const deleteContentMutation = useMutation({
        ...props.delete,
        onSuccess: (data, variables, context) => {
            if (props.delete.customOnSuccess) {
                props.delete.customOnSuccess(data, variables, context, setDeleteMutationResponse, setContentsState, setDeleteDialogOpen);
            }
            setDeleteMutationResponse(data);
            let shouldCloseDialog = false;

            if (data.success) {
                setContentsState(p => p.filter(a => a.id != data.success!.id));
                shouldCloseDialog = true;
            }

            if (shouldCloseDialog) {
                setDeleteDialogOpen(false);
                toast.success(`Penghapusan Berhasil!`);
            }
            // TODO! Alert
        }
    });

    const columnHelper = createColumnHelper<T>();

    const columns = useMemo(() => [
        ...props.columns,
        columnHelper.display({
            id: "actions",
            header: "Aksi",
            cell: cellProps => {
                if (props.shouldShowRowAction?.(cellProps) ?? true) {
                    const buttons = (
                        <div className={"flex gap-x-2"}>
                            {
                                props.additionalActions?.actions.map((a, index) => {
                                    return a.generateButton(cellProps.row.original);
                                })
                            }
                        </div>
                    );

                    return (
                        <div className={"flex gap-x-2"}>
                            {
                                props.additionalActions?.position == "before" && buttons
                            }
                            <RowAction
                                edit={() => {
                                    setActiveContent(contentsState.find(l => l.id == cellProps.row.original.id));
                                    setDialogOpen(true);
                                }}
                                delete={() => {
                                    setActiveContent(contentsState.find(l => l.id == cellProps.row.original.id));
                                    setDeleteDialogOpen(true);
                                }}
                            />
                            {
                                (props.additionalActions?.position == "after" || props.additionalActions == undefined) && buttons
                            }
                        </div>
                    );
                }
            }
        })
    ], [contentsState]);

    const tanTable = useReactTable({
        defaultColumn: {
            minSize: 0,
            size: 0,
        },
        columns: columns,
        data: contentsState,
        filterFns: {
          fuzzy: fuzzyFilter
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            globalFilter: searchValue,
        },
        // @ts-expect-error custom filter fn definition
        globalFilterFn: "fuzzy"
    });

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // Reset pagination when initial contents change
    useEffect(() => {
        setContentsState(props.initialContents);
        tanTable.firstPage();
    }, [props.initialContents]);

    useEffect(() => {
        if (!deleteDialogOpen) {
            setActiveContent(undefined);
            setDeleteMutationResponse(undefined);
        }
    }, [deleteDialogOpen]);

    useEffect(() => {
        if (!dialogOpen) {
            setActiveContent(undefined);
            setUpsertMutationResponse(undefined);
            props.queryParams?.clearQueryParams();
            setFromQuery(false);
        }
    }, [dialogOpen]);

    useEffect(() => {
        setContentsState(props.initialContents);
    }, [props.initialContents]);

    useEffect(() => {
        if (props.queryParams?.initialActiveContent) {
            setActiveContent({
                ...props.queryParams?.initialActiveContent,
            });
            setFromQuery(true);
            setDialogOpen(true);
        }
    }, [props.queryParams]);

    return (
        <div className={"p-8 flex-1 flex flex-col min-h-0 overflow-hidden"}>
            <div className={styles.searchBarAndCreate}>
                <Input
                    value={searchValue}
                    onChange={e => setSearchValue(e.target.value)}
                    label={"Search"}
                    placeholder={props.searchPlaceholder ?? "Search"}
                    className={styles.input}
                />
                <Button onClick={() => setDialogOpen(true)} color={"blue"} className={styles.btn}>
                    <FaPlus />
                    <span>Buat</span>
                </Button>
            </div>
            <div className="w-full flex-1 min-h-0 overflow-auto" style={{ height: '400px', overflowY: 'auto' }}>
                <TanTable tanTable={tanTable} />
            </div>
            <div className="flex items-center mt-4 gap-x-8">
                <div className={"ml-auto"}>
                    <Select
                        onChange={(value) => {
                            tanTable.setPageSize(Number(value));
                            tanTable.firstPage();
                        }}
                        label={"Item Per Halaman"}
                        containerProps={{
                            className: "!min-w-[175px]"
                        }}
                        value={tanTable.getState().pagination.pageSize.toString()}
                        className="flex p-2 border rounded background-gray"
                    >
                        {[5, 10, 20, 50].map(size => (
                            <Option key={size} value={size.toString()}>{size}</Option>
                        ))}
                    </Select>
                </div>
                <div className={"flex flex-row gap-x-8"}>
                    <IconButton
                        size="sm"
                        variant="outlined"
                        onClick={() => tanTable.previousPage()}
                        disabled={!tanTable.getCanPreviousPage()}
                    >
                        <FaArrowLeft strokeWidth={2} className="h-4 w-4" />
                    </IconButton>
                    <Typography color="gray" className="font-normal">
                        Page <strong className="text-gray-900">{tanTable.getState().pagination.pageIndex + 1}</strong> of{" "}
                        <strong className="text-gray-900">{tanTable.getPageCount()}</strong>
                    </Typography>
                    <IconButton
                        size="sm"
                        variant="outlined"
                        onClick={() => tanTable.nextPage()}
                        disabled={!tanTable.getCanNextPage()}
                    >
                        <FaArrowRight strokeWidth={2} className="h-4 w-4" />
                    </IconButton>
                </div>
            </div>
            <Dialog
                open={dialogOpen}
                size={"md"}
                handler={() => setDialogOpen(prev => {
                    if (prev) setActiveContent(undefined);
                    return !prev;
                })}
                className={"max-h-[85vh] overflow-y-auto"}
            >
                {
                    cloneElement(props.form, {
                        contentData: structuredClone(activeContent),
                        mutation: upsertContentMutation,
                        mutationResponse: upsertMutationResponse,
                        setDialogOpen: setDialogOpen,
                        fromQuery: fromQuery,
                    })
                }
            </Dialog>
            <Dialog
                open={deleteDialogOpen}
                size={"md"}
                handler={() => setDeleteDialogOpen(prev => !prev)}
                className={"p-8"}
            >
                <h2 className={"text-xl font-semibold text-black mb-4"}>Hapus {props.name}</h2>
                <span>Apakah Anda yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan.</span>
                {
                    deleteMutationResponse?.failure &&
                    <Typography className="whitespace-pre-wrap"
                                color="red">{deleteMutationResponse.failure}</Typography>
                }
                <div className={"flex gap-x-4 justify-end"}>
                    <Button onClick={() => setDeleteDialogOpen(false)} variant={"outlined"} className="mt-6">
                        Batal
                    </Button>
                    <Button
                        onClick={() => activeContent && deleteContentMutation.mutate(activeContent.id)}
                        color={"red"}
                        className="mt-6"
                        loading={deleteContentMutation.isPending}
                        disabled={!!deleteMutationResponse?.failure}
                    >
                        Hapus
                    </Button>
                </div>
            </Dialog>
            {
                props.customDialog
            }
        </div>
    );
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
    const itemRank = rankItem(row.getValue(columnId), value);

    // Store the itemRank info
    addMeta({ itemRank });

    // Return if the item should be filtered in/out
    return itemRank.passed;
};