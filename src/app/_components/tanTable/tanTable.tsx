import {Table} from "@tanstack/table-core";
import {Typography} from "@material-tailwind/react";
import {flexRender} from "@tanstack/react-table";
import {MdDelete, MdEdit} from "react-icons/md";
import {MouseEventHandler} from "react";
import styles from "./tanTable.module.css";
import {TiArrowSortedDown, TiArrowSortedUp} from "react-icons/ti";

export interface TanTableProps {
  tanTable: Table<any>
}

export default function TanTable({tanTable}: TanTableProps) {
  return (
    <table className={styles.table}>
      <thead className={styles.thead}>
      {tanTable.getHeaderGroups().map(headerGroup => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map(header => (
            <th
              key={header.id}
              colSpan={header.colSpan}
              style={{
                width: header.getSize() !== 0 ? header.getSize() : undefined,
              }}
              className={`${styles.th} ${header.column.getCanSort() ? "cursor-pointer" : ""}`}
              onClick={header.column.getToggleSortingHandler()}
            >
              <div className={styles.thContent}>
                <Typography
                  variant="small"
                  color="blue-gray"
                  className={styles.typography}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                </Typography>
                {{
                  asc: <TiArrowSortedUp/>,
                  desc: <TiArrowSortedDown/>,
                }[header.column.getIsSorted() as string] ?? null}
              </div>
            </th>
          ))}
        </tr>
      ))}
      </thead>
      <tbody>
      {tanTable.getRowModel().rows.map((row, index) => {
        return (<tr key={row.id} className={styles.tr}>
            {row.getVisibleCells().map(cell => (
              <td
                key={cell.id}
                className={styles.td}
                style={{
                  width:
                    cell.column.getSize() !== 0
                      ? cell.column.getSize()
                      : undefined,
                }}
              >
                <div>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              </td>
            ))}
          </tr>
        );
      })}
      </tbody>
    </table>
  );
}

export interface RowActionProps {
  edit: MouseEventHandler<SVGElement>
  delete: MouseEventHandler<SVGElement>
}

export function RowAction(props: RowActionProps) {
  return (
    <div className={styles.rowAction}>
      <MdEdit data-action={"edit"} onClick={props.edit}/>
      <MdDelete data-action={"delete"} className={"!hover:text-red-500"} onClick={props.delete}/>
    </div>
  );
}
