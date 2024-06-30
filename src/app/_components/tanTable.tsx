import {Table} from "@tanstack/table-core";
import {Typography} from "@material-tailwind/react";
import {flexRender} from "@tanstack/react-table";

export interface TanTableProps {
  tanTable: Table<any>
}

export default function TanTable({tanTable}: TanTableProps) {
  return (
    <table className="w-full min-w-max table-auto text-left rounded-t-lg">
      <thead className={"sticky top-0 z-10"}>
      {tanTable.getHeaderGroups().map(headerGroup => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map(header => (
            <th key={header.id} className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
              <Typography
                variant="small"
                color="blue-gray"
                className="font-normal leading-none opacity-70"
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
              </Typography>

            </th>
          ))}
        </tr>
      ))}
      </thead>
      <tbody>
      {tanTable.getRowModel().rows.map((row, index) => {
        const isLast = index === tanTable.getRowModel().rows.length - 1;
        const classes = isLast ? "p-4" : "p-4 border-b border-blue-gray-50";

        return (<tr key={row.id}>
            {row.getVisibleCells().map(cell => (
              <td key={cell.id} className={classes}>
                <div className={"text-sm text-gray-700 font-normal"}>
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
