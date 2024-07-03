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
import {Button, Input} from "@material-tailwind/react";
import {FaPlus} from "react-icons/fa6";

export interface LocationTableProps {
  locations: Location[]
}

export function LocationTable({locations}: LocationTableProps) {
  const [searchValue, setSearchValue] = useState("");

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
      cell: props => <RowAction edit={() => console.log("edit", props.row.id)}
                                delete={() => console.log("Delete", props.row.id)}/>
    })
  ], []);

  const tanTable = useReactTable({
    columns: columns,
    data: locations ?? [],
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
        <Button color={"blue"} className={styles.btn}>
          <FaPlus/>
          <span>Create</span>
        </Button>
      </div>
      <TanTable tanTable={tanTable}/>
    </>

  )
    ;
}
