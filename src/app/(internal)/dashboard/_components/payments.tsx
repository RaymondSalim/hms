"use client";

import React, {useContext, useMemo, useState} from "react";
import {DashboardContext} from "@/app/_context/DashboardContext";
import {useQuery} from "@tanstack/react-query";
import {getPaymentData, getPaymentStatuses} from "@/app/_db/dashboard";

import styles from "./styles/payments.module.css";
import {Button, Chip, Typography} from "@material-tailwind/react";
import {createColumnHelper, flexRender, getCoreRowModel, useReactTable} from "@tanstack/react-table";
import {colors} from "@material-tailwind/react/types/generic";
import {AiOutlineLoading} from "react-icons/ai";

const fallbackData: never[] = [];

export default function Payments() {
  const dashboardContext = useContext(DashboardContext);
  const [status, setStatus] = useState<number | undefined>(undefined);

  const {data: paymentStatuses, isSuccess: statusIsSuccess} = useQuery({
    queryKey: ['dashboard.paymentStatus'],
    queryFn: () => getPaymentStatuses()
  });

  const {data: payments, isLoading: paymentsIsLoading, isSuccess: paymentsIsSuccess} = useQuery({
    queryKey: ['dashboard.payments', dashboardContext.locationID, status],
    queryFn: () => getPaymentData(status, dashboardContext.locationID)
  });

  const columnHelper = createColumnHelper();

  const columns = useMemo(() => [
    columnHelper.accessor("id", {
      header: "ID",
    }),
    columnHelper.accessor("bookings.tenants.name", {
      header: "Tenant",
    }),
    columnHelper.accessor("paymentstatuses.status", {
      header: "Status",
      cell: (props) => {
        let value: string = props.getValue();
        let color: colors | undefined;
        switch (value.toLowerCase()) {
          case "completed": {
            color = "green";
            break;
          }
          case "pending": {
            color = "yellow";
            break;
          }
          case "failed": {
            color = "red";
            break;
          }
          default: {
            color = undefined;
          }
        }

        return <Chip value={value} size={"sm"} color={color} className={"z-0 text-center"}/>;
      }
    }),
    columnHelper.accessor("bookings.rooms.room_number", {
      header: "Room Number",
    }),
    columnHelper.accessor("bookings.durations.duration", {
      header: "Duration",
    }),
    columnHelper.accessor("amount", {
      header: "Amount",
    }),
  ], []);

  const tanTable = useReactTable({
    // @ts-ignore
    columns: columns,
    data: payments ?? fallbackData,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className={styles.paymentsContainer}>
      <h2>Payments</h2>
      <div className={styles.statusContent}>
        <Button variant={status == null ? 'filled' : 'outlined'} size={"sm"} className={styles.btn}
                onClick={() => setStatus(undefined)}>All</Button>
        {
          statusIsSuccess &&
          paymentStatuses.map((s) => (
            <Button variant={status == s.id ? 'filled' : 'outlined'} size={"sm"} key={s.id}
                    onClick={() => setStatus(s.id)} className={styles.btn}>{s.status}</Button>
          ))
        }
      </div>
      <div className={styles.paymentsContent}>
        {
          paymentsIsLoading && <div className={"w-full flex items-center justify-center"}>
                <AiOutlineLoading size={"3rem"} className={"animate-spin my-8"}/>
            </div>
        }
        {
          paymentsIsSuccess &&
            <table className="block w-full h-full min-w-max table-auto text-left rounded-t-lg">
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
        }
      </div>
    </div>
  );
}
