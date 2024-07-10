"use client";

import {
  CellContext,
  ColumnDef,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import {cloneElement, ReactElement, useEffect, useMemo, useState} from "react";
import TanTable, {RowAction} from "@/app/_components/tanTable/tanTable";
import styles from "@/app/(internal)/data-center/locations/components/searchBarAndCreate.module.css";
import {Button, Dialog, Input} from "@material-tailwind/react";
import {FaPlus} from "react-icons/fa6";
import {DefaultError, MutationOptions, useMutation, UseMutationResult} from "@tanstack/react-query";
import {GenericActionsType} from "@/app/_lib/actions";

export interface TableFormProps<T> {
  contentData?: T
  setDialogOpen: (open: boolean) => void
  mutation: UseMutationResult<GenericActionsType<T>, DefaultError, Partial<T>>,
  mutationResponse?: GenericActionsType<T>
}

export interface TableContentProps<T extends { id: number | string }, _TReturn = GenericActionsType<T>> {
  name: string,
  initialContents: T[],
  upsert: MutationOptions<_TReturn, DefaultError, Partial<T>>,
  delete: MutationOptions<_TReturn, DefaultError, string | number>,
  columns: ColumnDef<T, any>[],

  searchPlaceholder?: string,
  form: ReactElement<TableFormProps<T>>
  shouldShowRowAction?: (props: CellContext<T, unknown>) => boolean
}

export function TableContent<T extends { id: number | string }>(props: TableContentProps<T>) {
  const [contentsState, setContentsState] = useState<T[]>(props.initialContents);
  const [searchValue, setSearchValue] = useState("");
  const [activeContent, setActiveContent] = useState<T | undefined>(undefined);
  const [mutationResponse, setMutationResponse] = useState<GenericActionsType<T> | undefined>(undefined);

  const upsertContentMutation = useMutation({
    ...props.upsert,
    onSuccess: (data, variables, context) => {
      props.upsert.onSuccess?.(data, variables, context);
      setMutationResponse(data);
      let shoudCloseDialog = false;

      if (data.success) {
        setContentsState(prevState => {
          let newArr = [...prevState];
          let index = newArr.findIndex(l => l.id == data.success?.id);
          if (index == -1) {
            return newArr.concat(data.success!);
          } else {
            newArr[index] = data.success!;
          }
          return newArr;
        });
        shoudCloseDialog = true;
      }

      if (shoudCloseDialog) {
        setDialogOpen(false);
        // TODO! Alert
      }
    }
  });

  const deleteContentMutation = useMutation({
    ...props.delete,
    onSuccess: (data, variables, context) => {
      props.delete.onSuccess?.(data, variables, context);
      if (data.success) {
        setContentsState(p => p.filter(a => a.id != data.success!.id));
      }

      setDeleteDialogOpen(false);
      // TODO! Alert
    }
  });

  const columnHelper = createColumnHelper<T>();

  const columns = useMemo(() => [
    ...props.columns,
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: cellProps => {
        if (props.shouldShowRowAction?.(cellProps) ?? true) {
          return <RowAction
            edit={() => {
              setActiveContent(contentsState.find(l => l.id == cellProps.row.original.id));
              setDialogOpen(true);
            }}
            delete={() => {
              setActiveContent(contentsState.find(l => l.id == cellProps.row.original.id));
              setDeleteDialogOpen(true);
            }}
          />;
        }
      }
    })
  ], [contentsState]);

  const tanTable = useReactTable({
    columns: columns,
    data: contentsState ?? [],
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      globalFilter: searchValue,
    },
    globalFilterFn: (row, columnId, filterValue) => {
      if (typeof row.getValue(columnId) == "string") {
        return (row.getValue(columnId) as string).toLowerCase().includes(filterValue.toLowerCase());
      }

      return false;
    },

  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!dialogOpen) {
      setActiveContent(undefined);
      setMutationResponse(undefined);
    }
  }, [dialogOpen]);

  useEffect(() => {
    setContentsState(props.initialContents);
  }, [props.initialContents]);

  return (
    <>
      <div className={styles.searchBarAndCreate}>
        <Input
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          label={"Search"}
          placeholder={props.searchPlaceholder ?? "Search"}
          className={styles.input}
        />
        <Button onClick={() => setDialogOpen(true)} color={"blue"} className={styles.btn}>
          <FaPlus/>
          <span>Create</span>
        </Button>
      </div>
      <div className={"w-full overflow-auto"}>
        <TanTable tanTable={tanTable}/>
      </div>
      <Dialog
        open={dialogOpen}
        size={"md"}
        handler={() => setDialogOpen(prev => {
          if (prev) setActiveContent(undefined);
          return !prev;
        })}
      >
        {
          cloneElement(props.form, {
            contentData: activeContent,
            mutation: upsertContentMutation,
            mutationResponse: mutationResponse,
            setDialogOpen: setDialogOpen
          })
        }
      </Dialog>
      <Dialog
        open={deleteDialogOpen}
        size={"md"}
        handler={() => setDeleteDialogOpen(prev => {
          if (prev) setActiveContent(undefined);
          return !prev;
        })}
        className={"p-8"}
      >
        <h2 className={"text-xl font-semibold text-black mb-4"}>Delete {props.name}</h2>
        <span>Are you sure you want to delete this item? This action cannot be undone.</span>
        <div className={"flex gap-x-4 justify-end"}>
          <Button onClick={() => setDeleteDialogOpen(false)} variant={"outlined"} className="mt-6">
            Cancel
          </Button>
          <Button onClick={() => activeContent && deleteContentMutation.mutate(activeContent.id)} color={"red"}
                  className="mt-6"
                  loading={deleteContentMutation.isPending}>
            Delete
          </Button>
        </div>
      </Dialog>
    </>

  );
}
