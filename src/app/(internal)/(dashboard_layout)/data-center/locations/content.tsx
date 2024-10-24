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
import styles from "@/app/(internal)/(dashboard_layout)/data-center/locations/components/searchBarAndCreate.module.css";
import {Button, Dialog, Input} from "@material-tailwind/react";
import {FaPlus} from "react-icons/fa6";
import {LocationForm} from "@/app/(internal)/(dashboard_layout)/data-center/locations/components/locationForm";
import {useMutation} from "@tanstack/react-query";
import {
    deleteLocationAction,
    upsertLocationAction
} from "@/app/(internal)/(dashboard_layout)/data-center/locations/location-action";

export interface LocationsContentProps {
  locations: Location[]
}

// TODO! This file seems to not use tantable component properly (dialogs)
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
      header: "Nama",
    }),
    columnHelper.accessor(row => row.address, {
      id: "address",
      header: "Alamat",
    }),
    columnHelper.display({
      id: "actions",
      header: "Aksi",
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
          label={"Cari"}
          placeholder={"Cari dengan nama atau alamat email"}
          className={styles.input}
        />
        <Button onClick={() => setDialogOpen(true)} color={"blue"} className={styles.btn}>
          <FaPlus/>
          <span>Buat</span>
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
        <h2 className={"text-xl font-semibold text-black mb-4"}>Hapus Lokasi</h2>
        <span>Apakah Anda yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan.</span>
        <div className={"flex gap-x-4 justify-end"}>
          <Button onClick={() => setDeleteDialogOpen(false)} variant={"outlined"} className="mt-6">
            Batal
          </Button>
          <Button onClick={() => activeLocation && deleteLocationMutation.mutate(activeLocation.id)} color={"red"}
                  className="mt-6"
                  loading={deleteLocationMutation.isPending}>
            Hapus
          </Button>
        </div>
      </Dialog>
    </>

  );
}
