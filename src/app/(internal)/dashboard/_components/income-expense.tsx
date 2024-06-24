"use client";

import React, {useContext, useState} from "react";
import styles from "./styles/incomeExpense.module.css";
import {DashboardContext} from "@/app/_context/DashboardContext";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip
} from "chart.js";
import {Line} from "react-chartjs-2";
import {getIncomeAndExpense} from "@/app/_db/dashboard";
import {keepPreviousData, useQuery} from "@tanstack/react-query";
import {AiOutlineLoading} from "react-icons/ai";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  PointElement
);

enum Period {
  SEVEN_DAYS = '7 D',
  ONE_MONTH = '1 M',
  THREE_MONTHS = '3 M',
  SIX_MONTHS = '6 M',
  ONE_YEAR = '1 Y'
}

export default function IncomeExpense() {
  const dashboardContext = useContext(DashboardContext);
  const [period, setPeriod] = useState<Period>(Period.ONE_YEAR);
  const {data, isLoading, isSuccess} = useQuery({
    queryKey: ['dashboard.incomeExpense', dashboardContext.locationID, period],
    queryFn: () => getIncomeAndExpense(period, dashboardContext.locationID),
    placeholderData: keepPreviousData,
  });


  return (
    <div className={styles.incomeExpenseContainer}>
      <div className={styles.headerContainer}>
        <h2>Income vs Expense</h2>
        <div className={styles.datePicker}>
          {Object.values(Period).map((value, index) => {
            return <span
              className={`${styles.datePickerItem} ${period == value ? styles.active : ''}`}
              key={index}
              onClick={() => setPeriod(value)}
            >
              {value}
            </span>;
          })}
        </div>
      </div>
      <div className={styles.incomeExpenseContent}>
        {
          isLoading && <div className={"flex items-center justify-center"}>
                <AiOutlineLoading size={"3rem"} className={"animate-spin my-8"}/>
            </div>
        }
        {
          isSuccess &&
            <Line
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    tooltip: {
                      callbacks: {
                        label: (value) => `IDR ${value.formattedValue}`
                      }
                    }
                  },
                  interaction: {
                    intersect: false,
                    mode: 'index',
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                    x: {
                      ticks: {
                        autoSkip: true,
                        maxTicksLimit: 15
                      }
                    }
                  },

                }}
                data={{
                  labels: data?.labels,
                  datasets: [{
                    label: 'Income',
                    data: data?.incomeData,
                    fill: 'origin',
                    borderWidth: 1,
                    borderColor: '#798bff',
                    backgroundColor: 'rgb(235, 238, 255, 0.5)',
                    tension: 0.2,
                    order: 100,
                    pointStyle: false
                  }, {
                    label: 'Expense',
                    data: data?.expenseData,
                    borderColor: '#e85347',
                    borderWidth: 1,
                    borderDash: [10, 5],
                    tension: 0.2,
                    order: 50,
                    pointStyle: false
                  }]
                }}
            />
        }
      </div>
    </div>
  );
}
