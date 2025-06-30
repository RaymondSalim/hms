"use client";

import {convertGroupedTransactionsToTotals, formatToDateTime, formatToIDR, preparePieChartData} from "@/app/_lib/util";
import React, {useEffect, useState} from "react";
import {getGroupedIncomeExpense, getRecentTransactions} from "@/app/_db/dashboard";
import {useHeader} from "@/app/_context/HeaderContext";
import {Period} from "@/app/_enum/financial";
import {useQuery} from "@tanstack/react-query";
import {Button, Card, CardBody, CardFooter, Typography} from "@material-tailwind/react";
import IncomeExpenseGraph, {IncomeExpenseGraphProps} from "@/app/_components/financials/income-expense-graph";
import {Prisma, TransactionType} from "@prisma/client";
import {Pie} from "react-chartjs-2";
import {ArcElement, Chart as ChartJS, ChartData, Colors} from "chart.js";
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {AiOutlineLoading} from "react-icons/ai";

ChartJS.register(ArcElement, Colors);

export default function FinancialSummaryPage() {
    const headerContext = useHeader();

    const [selectedPeriod, setSelectedPeriod] = useState<Period>(Period.ONE_YEAR);

    const [totalIncome, setTotalIncome] = useState<number | null>(null);
    const [totalExpense, setTotalExpense] = useState<number | null>(null);
    const [netIncome, setNetIncome] = useState<number | null>(null);

    const [transactions, setTransactions] = useState<IncomeExpenseGraphProps['data'] | undefined>(undefined);

    const {data: groupedIncomeExpense, isLoading: isTransactionsLoading, isSuccess: isTransactionsSuccess} = useQuery({
        queryKey: ["groupedIncomeExpense", selectedPeriod, headerContext.locationID],
        queryFn: () => getGroupedIncomeExpense(selectedPeriod, headerContext.locationID),
    });

    const {data: recentTransactions, isLoading: isRecentLoading, isSuccess: isRecentSuccess} = useQuery({
        queryKey: ["recentTransactions", headerContext.locationID],
        queryFn: () => getRecentTransactions(headerContext.locationID),
    });

    // Category Breakdown
    const [selectedCategory, setSelectedCategory] = useState<TransactionType>(TransactionType.EXPENSE);
    const [categoryBreakdownData, setCategoryBreakdownData] = useState<{
        INCOME: ChartData<"pie", number[]>,
        EXPENSE: ChartData<"pie", number[]>,
    } | undefined>();

    function updateCategoryBreakdownData() {
        if (groupedIncomeExpense) {
            const allIncomeData = groupedIncomeExpense.incomeData.flat();
            const allExpensesData = groupedIncomeExpense.expenseData.flat();

            const incomePieChartData = preparePieChartData(allIncomeData);
            const expensePieChartData = preparePieChartData(allExpensesData);

            setCategoryBreakdownData({
                INCOME: incomePieChartData,
                EXPENSE: expensePieChartData,
            });
        }
    }

    useEffect(() => {
        if (isTransactionsSuccess) {
            const newTransactions = convertGroupedTransactionsToTotals(groupedIncomeExpense);
            setTransactions(newTransactions);

            const inc = newTransactions.incomeData.reduce((sum, value) => sum + value, 0);
            const exp = newTransactions.expenseData.reduce((sum, value) => sum + value, 0);
            setTotalIncome(inc);
            setTotalExpense(exp);
            setNetIncome(inc - exp);

            updateCategoryBreakdownData();
        }
    }, [isTransactionsSuccess, groupedIncomeExpense]);

    return (
        <div className="min-h-screen pb-8 md:px-8 md:-mt-8">
            <div className="container mx-auto">
                <div className={"w-min ml-auto mb-4"}>
                    <div
                        className={"min-h-0 h-fit border border-gray-400 rounded-md flex divide-x divide-gray-400 overflow-hidden"}>
                        {Object.values(Period).map((value, index) => {
                            return (
                                <span
                                    key={index}
                                    className={`whitespace-nowrap px-2 py-2 text-xs text-black font-semibold cursor-pointer transition-colors ease-in-out duration-300 overflow-clip ${
                                        selectedPeriod === value ? "bg-black text-white" : "bg-white"
                                    }`}
                                    onClick={() => setSelectedPeriod(value)}
                                >
                                  {value}
                                </span>
                            );
                        })}
                    </div>
                </div>

                {/* Quick Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-green-100 shadow-md p-4 rounded">
                        <CardBody>
                            <Typography variant="h6" className="font-semibold">
                                Total Pemasukan
                            </Typography>
                            <Typography variant="h4">{totalIncome ? formatToIDR(totalIncome) : "-"}</Typography>
                        </CardBody>
                    </Card>
                    <Card className="bg-red-100 shadow-md p-4 rounded">
                        <CardBody>
                            <Typography variant="h6" className="font-semibold">
                                Total Pengeluaran
                            </Typography>
                            <Typography variant="h4">{totalExpense ? formatToIDR(totalExpense) : "-"}</Typography>
                        </CardBody>
                    </Card>
                    <Card className="bg-blue-100 shadow-md p-4 rounded">
                        <CardBody>
                            <Typography variant="h6" className="font-semibold">
                                Pendapatan Bersih
                            </Typography>
                            <Typography variant="h4">{netIncome ? formatToIDR(netIncome) : "-"}</Typography>
                        </CardBody>
                    </Card>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8">
                    <div className="flex flex-col gap-4">
                        <Card className="shadow-md max-h-[80dvh] h-fit overflow-auto">
                            <CardBody className="p-8 overflow-x-auto">
                                <Typography variant="h5" className="font-semibold">Pemasukan & Pengeluaran</Typography>
                                {
                                    isTransactionsSuccess &&
                                    <table className="min-w-full border border-gray-300 mt-4">
                                        <thead>
                                        <tr className="bg-gray-100">
                                            <th className="px-4 py-2 border">Tanggal</th>
                                            <th className="px-4 py-2 border">Pemasukan</th>
                                            <th className="px-4 py-2 border">Pengeluaran</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {transactions &&
                                            transactions.labels.map((date, idx) => (
                                                <tr key={date}>
                                                    <td className="px-4 py-2 border">{date}</td>
                                                    <td className="px-4 py-2 border">{formatToIDR(transactions.incomeData[idx])}</td>
                                                    <td className="px-4 py-2 border">{formatToIDR(transactions.expenseData[idx])}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                }
                                {
                                    isTransactionsLoading &&
                                    <div className={"flex items-center justify-center"}>
                                        <AiOutlineLoading size={"3rem"} className={"animate-spin my-8"}/>
                                    </div>
                                }
                            </CardBody>
                            <CardFooter className="p-4">
                                <Typography variant="small" className="text-gray-600">
                                    Data per tanggal: {formatToDateTime(new Date())}
                                </Typography>
                            </CardFooter>
                        </Card>
                        <Card className="shadow-md max-h-[80dvh] h-fit overflow-auto">
                            <CardBody className="p-8 overflow-x-auto flex flex-col gap-y-6">
                                <Typography variant="h5" className="font-semibold">Rincian Kategori</Typography>
                                <div className={"flex gap-x-2 overflow-x-auto flex-shrink-0"}>
                                    {
                                        Object.keys(TransactionType).map(t => (
                                            <Button key={t} variant={selectedCategory == t ? 'filled' : 'outlined'}
                                                    size={"sm"}
                                                    className={"min-h-fit min-w-fit rounded-full whitespace-nowrap"}
                                                    onClick={() => setSelectedCategory(t as TransactionType)}>
                                                {t}
                                            </Button>
                                        ))
                                    }

                                </div>
                                <div className={"flex flex-shrink items-center justify-center px-8"}>
                                    {
                                        isTransactionsSuccess && (
                                            categoryBreakdownData ?
                                                <Pie
                                                    // @ts-expect-error weird plugin error
                                                    plugins={[ChartDataLabels]}
                                                    className={"w-3/4 min-h-fit"}
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
                                                            colors: {
                                                                enabled: true,
                                                            },
                                                            datalabels: {
                                                                formatter: (value, ctx) => {
                                                                    let sum = 0;
                                                                    let dataArr = ctx.chart.data.datasets[0].data;
                                                                    dataArr.map(data => {
                                                                        // @ts-expect-error type error
                                                                        sum += data ?? 0;
                                                                    });
                                                                    return (value * 100 / sum).toFixed(2) + "%";
                                                                },
                                                                color: '#fff',
                                                            }
                                                        },
                                                        interaction: {
                                                            intersect: false,
                                                            mode: 'index',
                                                        },
                                                    }}
                                                    data={
                                                        selectedCategory == TransactionType.EXPENSE ?
                                                            categoryBreakdownData.EXPENSE :
                                                            categoryBreakdownData.INCOME
                                                    }
                                                />
                                                : <Typography>Tidak ada data kategori.</Typography>
                                        )
                                    }
                                    {
                                        isTransactionsLoading &&
                                        <div className={"flex items-center justify-center"}>
                                            <AiOutlineLoading size={"3rem"} className={"animate-spin my-8"}/>
                                        </div>
                                    }
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                    <div className="flex flex-col gap-4">
                        <Card className="shadow-md max-h-[80dvh] h-fit overflow-auto">
                            <CardBody className="overflow-x-auto">
                                <Typography variant="h5" className="font-semibold p-2">Grafik Pemasukan &
                                    Pengeluaran</Typography>
                                <IncomeExpenseGraph
                                    showPeriodPicker={false}
                                    isSuccess={isTransactionsSuccess}
                                    isLoading={isTransactionsLoading}
                                    data={transactions}
                                    period={undefined}
                                    setPeriod={undefined}
                                />
                            </CardBody>
                        </Card>
                        <Card className="shadow-md max-h-[80dvh] h-fit overflow-auto">
                            <CardBody className="p-8 w-full">
                                <Typography variant="h5" className="font-semibold">Transaksi Terbaru</Typography>
                                <div className={"overflow-auto"}>
                                    {
                                        isRecentSuccess && recentTransactions &&
                                        (
                                            recentTransactions.length > 0 ?
                                                <table className="min-w-full border border-gray-300 mt-4">
                                                    <thead>
                                                    <tr className="bg-gray-100">
                                                        <th className="px-4 py-2 border">Date</th>
                                                        <th className="px-4 py-2 border">Description</th>
                                                        <th className="px-4 py-2 border">Amount</th>
                                                        <th className="px-4 py-2 border">Type</th>
                                                    </tr>
                                                    </thead>
                                                    <tbody>
                                                    {recentTransactions.map((txn, index) => (
                                                        <tr key={index}>
                                                            <td className="px-4 py-2 border">{formatToDateTime(new Date(txn.date))}</td>
                                                            <td className="px-4 py-2 border">{txn.description}</td>
                                                            <td className="px-4 py-2 border">{formatToIDR(new Prisma.Decimal(txn.amount).toNumber())}</td>
                                                            <td className="px-4 py-2 border">{txn.type}</td>
                                                        </tr>
                                                    ))}
                                                    </tbody>
                                                </table>
                                                : <Typography>Tidak ada transaksi baru.</Typography>
                                        )
                                    }
                                    {
                                        isRecentLoading &&
                                        <div className={"flex items-center justify-center"}>
                                            <AiOutlineLoading size={"3rem"} className={"animate-spin my-8"}/>
                                        </div>
                                    }
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </div>

            </div>
        </div>
    );
}
