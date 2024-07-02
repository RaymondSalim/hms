"use client";

import styles from "./styles/bills.module.css";
import React, {useContext, useMemo, useState} from "react";
import {HeaderContext} from "@/app/_context/HeaderContext";
import {useQuery} from "@tanstack/react-query";
import {getBills, getDurations} from "@/app/_db/dashboard";
import {createColumnHelper, getCoreRowModel, useReactTable} from "@tanstack/react-table";
import {Button} from "@material-tailwind/react";
import {AiOutlineLoading} from "react-icons/ai";
import TanTable from "@/app/_components/tanTable";

export default function Bills() {
  const dashboardContext = useContext(HeaderContext);
  const [durationID, setDurationID] = useState<number | undefined>(undefined);

  const {data: durationData, isSuccess: durationIsSuccess} = useQuery({
    queryKey: ['dashboard.durations'],
    queryFn: () => getDurations()
  });

  const {data: bills, isLoading: billsIsLoading, isSuccess: billsIsSuccess} = useQuery({
    queryKey: ['dashboard.bills', dashboardContext.locationID, durationID],
    queryFn: () => getBills(durationID, dashboardContext.locationID)
  });

  const columnHelper = createColumnHelper<{
    id: string,
    fee: string,
    tenant_id: string,
    tenant_name: string,
    room_number: string,
    total_paid: string
  }>();

  const columns = useMemo(() => [
    columnHelper.accessor("id", {
      id: "id",
      header: "ID",
    }),
    columnHelper.accessor("tenant_name", {
      id: "tenantName",
      header: "Tenant",
    }),
    columnHelper.accessor("room_number", {
      id: "roomNumber",
      header: "Room Number",
    }),
    columnHelper.accessor("fee", {
      id: "fee",
      header: "Total Fee",
    }),
    columnHelper.accessor("total_paid", {
      id: "totalPaid",
      header: "Amount Paid",
    }),
    columnHelper.display({
      header: "Amount Due",
      cell: props => {
        return parseInt(props.row.original.fee) - parseInt(props.row.original.total_paid);
      }
    })
  ], []);

  const tanTable = useReactTable({
    columns: columns,
    data: bills ?? [],
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={styles.billsContainer}>
      <h2>Unpaid Bills</h2>
      <div className={styles.billsTableContainer}>
        <div className={styles.durationContent}>
          <Button variant={durationID == null ? 'filled' : 'outlined'} size={"sm"} className={styles.btn}
                  onClick={() => setDurationID(undefined)}>All</Button>
          {
            durationIsSuccess &&
            durationData.map((s) => (
              <Button variant={durationID == s.id ? 'filled' : 'outlined'} size={"sm"} key={s.id}
                      onClick={() => setDurationID(s.id)} className={styles.btn}>{s.duration}</Button>
            ))
          }
        </div>
        <div className={styles.billsContent}>
          {
            billsIsLoading && <div className={"w-full flex items-center justify-center"}>
                  <AiOutlineLoading size={"3rem"} className={"animate-spin my-8"}/>
              </div>
          }
          {
            billsIsSuccess &&
              <TanTable tanTable={tanTable}/>
          }
        </div>
      </div>
    </div>
  );
}
