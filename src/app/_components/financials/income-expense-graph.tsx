"use client";

import React, {ReactElement} from "react";
import styles from "./incomeExpenseGraph.module.css";
import {CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip} from "chart.js";
import {Line} from "react-chartjs-2";
import {AiOutlineLoading} from "react-icons/ai";
import {Period} from "@/app/_enum/financial";
import {SimplifiedIncomeExpense} from "@/app/_db/dashboard";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

export type IncomeExpenseGraphProps = (
    {
        showPeriodPicker: true;
        period: Period;
        setPeriod: React.Dispatch<React.SetStateAction<Period>>;
    } |
    {
        showPeriodPicker: false;
        period?: never;
        setPeriod?: never;
    }
    ) & {
    title?: ReactElement;
    isSuccess: boolean;
    isLoading: boolean;
    data?: SimplifiedIncomeExpense
};

export default function IncomeExpenseGraph({
                                               showPeriodPicker,
                                               period, setPeriod,
                                               isLoading, isSuccess,
                                               data, title
                                           }: IncomeExpenseGraphProps) {
    return (
        <div className={styles.incomeExpenseContainer}>
            <div className={styles.headerContainer}>
                {
                    title != undefined && title
                }
                {
                    showPeriodPicker &&
                    <div className={styles.datePicker}>
                        {
                            Object.values(Period).map((value, index) => {
                                return (
                                    <span
                                        className={`${styles.datePickerItem} ${period == value ? styles.active : ''}`}
                                        key={index}
                                        onClick={() => setPeriod(value)}
                                    >
                                      {value}
                                    </span>
                                );
                            })
                        }
                    </div>
                }
            </div>
            <div className={styles.incomeExpenseContent}>
                {
                    isLoading && <div className={"flex items-center justify-center"}>
                        <AiOutlineLoading size={"3rem"} className={"animate-spin my-8"}/>
                    </div>
                }
                {
                    isSuccess && <div className={"aspect-[2/1]"}>
                        <Line
                            options={{
                                responsive: true,
                                maintainAspectRatio: true,
                                plugins: {
                                    legend: {
                                        position: 'top' as const,
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: (value) => `IDR ${value.formattedValue}`
                                        }
                                    },
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
                                    tension: 0.1,
                                    order: 50,
                                    pointStyle: false
                                }]
                            }}
                        />
                    </div>
                }
            </div>
        </div>
    );
}
