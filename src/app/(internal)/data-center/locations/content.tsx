"use client";

import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import {useMemo, useState} from "react";
import {Location} from "@prisma/client";
import TanTable, {RowAction} from "@/app/_components/tanTable/tanTable";
import styles from "@/app/(internal)/data-center/locations/components/searchBarAndCreate.module.css";
import {Button, Dialog, Input} from "@material-tailwind/react";
import {FaPlus} from "react-icons/fa6";
import {LocationForm} from "@/app/(internal)/data-center/locations/components/locationForm";
import {useMutation} from "@tanstack/react-query";
import {deleteLocationAction, upsertLocationAction} from "@/app/(internal)/data-center/locations/location-action";

export interface LocationsContentProps {
  locations: Location[]
}

export function LocationsContent({locations}: LocationsContentProps) {
  const [locationsState, setLocationsState] = useState<Location[]>(locations);
  const [searchValue, setSearchValue] = useState("");
  const [activeLocation, setActiveLocation] = useState<Location | undefined>(undefined);

  const upsertLocationMutation = useMutation({
    mutationFn: upsertLocationAction,
    onSuccess: (resp) => {
      if (resp.success) {
        setLocationsState(prevState => {
          let newArr = [...prevState];
          let index = newArr.findIndex(l => l.id == resp.success!.id);
          if (index == -1) {
            return newArr.concat(resp.success!);
          } else {
            newArr[index] = resp.success!;
          }
          return newArr;
        });
      }

      setActiveLocation(undefined);
      setDialogOpen(false);
      // TODO! Alert
    }
  });

  const deleteLocationMutation = useMutation({
    mutationFn: deleteLocationAction,
    onSuccess: (resp) => {
      if (resp.success) {
        setLocationsState(p => p.filter(a => a.id != resp.success!.id));
        setDeleteDialogOpen(false);
        // TODO! Alert
      }
    }
  });

  const columnHelper = createColumnHelper<Location>();

  const columns = useMemo(() => [
    columnHelper.accessor(row => row.id, {
      id: "id",
      header: "ID",
    }),
    columnHelper.accessor(row => row.name, {
      id: "name",
      header: "Name",
    }),
    columnHelper.accessor(row => row.address, {
      id: "address",
      header: "Address",
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: props => <RowAction
        edit={() => {
          setActiveLocation(locationsState.find(l => l.id == props.row.original.id));
          setDialogOpen(true);
        }}
        delete={() => {
          setActiveLocation(locationsState.find(l => l.id == props.row.original.id));
          setDeleteDialogOpen(true);
        }}
      />
    })
  ], [locationsState]);

  const tanTable = useReactTable({
    columns: columns,
    data: locationsState ?? [],
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

  return (
    <>
      <div className={styles.searchBarAndCreate}>
        <Input
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          label={"Search"}
          placeholder={"Search by address or name"}
          className={styles.input}
        />
        <Button onClick={() => setDialogOpen(true)} color={"blue"} className={styles.btn}>
          <FaPlus/>
          <span>Create</span>
        </Button>
      </div>
      <TanTable tanTable={tanTable}/>
      <Dialog
        open={dialogOpen}
        size={"md"}
        handler={() => setDialogOpen(prev => {
          if (prev) setActiveLocation(undefined);
          return !prev;
        })}
      >
        <LocationForm location={activeLocation} setDialogOpen={setDialogOpen} mutation={upsertLocationMutation}/>
      </Dialog>
      <Dialog
        open={deleteDialogOpen}
        size={"md"}
        handler={() => setDeleteDialogOpen(prev => {
          if (prev) setActiveLocation(undefined);
          return !prev;
        })}
        className={"p-8"}
      >
        <h2 className={"text-xl font-semibold text-black mb-4"}>Delete Location</h2>
        <span>Are you sure you want to delete this item? This action cannot be undone.</span>
        <div className={"flex gap-x-4 justify-end"}>
          <Button onClick={() => setDeleteDialogOpen(false)} variant={"outlined"} className="mt-6">
            Cancel
          </Button>
          <Button onClick={() => activeLocation && deleteLocationMutation.mutate(activeLocation.id)} color={"red"}
                  className="mt-6"
                  loading={deleteLocationMutation.isPending}>
            Delete
          </Button>
        </div>
      </Dialog>
    </>

  );
}
