"use client";

import React, {useMemo, useState} from "react";
import {useHeader} from "@/app/_context/HeaderContext";
import {useQuery} from "@tanstack/react-query";
import {getPaymentData} from "@/app/_db/dashboard";

import styles from "./styles/payments.module.css";
import {Button, Chip} from "@material-tailwind/react";
import {createColumnHelper, getCoreRowModel, useReactTable} from "@tanstack/react-table";
import {colors} from "@material-tailwind/react/types/generic";
import {AiOutlineLoading} from "react-icons/ai";
import TanTable from "@/app/_components/tanTable/tanTable";
import {getPaymentStatusAction} from "@/app/(internal)/(dashboard_layout)/payments/payment-action";

const fallbackData: never[] = [];

export default function Payments() {
  const dashboardContext = useHeader();
  const [status, setStatus] = useState<number | undefined>(undefined);

  const {data: paymentStatuses, isSuccess: statusIsSuccess} = useQuery({
    queryKey: ['payment.status'],
    queryFn: () => getPaymentStatusAction()
  });

  const {data: payments, isLoading: paymentsIsLoading, isSuccess: paymentsIsSuccess} = useQuery({
    queryKey: ['payment', dashboardContext.locationID, status],
    queryFn: () => getPaymentData(status, dashboardContext.locationID)
  });

  const columnHelper = createColumnHelper();

  const columns = useMemo(() => [
    columnHelper.accessor("id", {
      header: "ID",
    }),
    columnHelper.accessor("bookings.tenants.name", {
      header: "Penyewa",
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
      header: "Nomor Kamar",
    }),
    columnHelper.accessor("bookings.durations.duration", {
      header: "Durasi",
    }),
    columnHelper.accessor("amount", {
      header: "Jumlah",
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
      <div className={styles.statusPaymentContainer}>
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
              <TanTable tanTable={tanTable}/>
          }
        </div>
      </div>
    </div>
  );
}
