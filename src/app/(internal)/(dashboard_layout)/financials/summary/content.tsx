"use client";

import {convertGroupedTransactionsToTotals, formatToDateTime, formatToIDR, preparePieChartData} from "@/app/_lib/util";
import React, {useEffect, useRef, useState} from "react";
import {
    getGroupedIncomeExpenseAction,
    getRecentTransactionsAction
} from "@/app/(internal)/(dashboard_layout)/dashboard/dashboard-action";
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
import {FiMaximize2, FiMinimize2} from "react-icons/fi";
import {DatePicker} from "@/app/_components/DateRangePicker";
import {DateRange} from "react-day-picker";

type PeriodMode = "preset" | "all" | "custom";
type ExpandableSection = "transactionsTable" | "depositTransactionsTable" | "category" | "graph" | "recent";

ChartJS.register(ArcElement, Colors);

export default function FinancialSummaryPage() {
    const headerContext = useHeader();

    const [periodMode, setPeriodMode] = useState<PeriodMode>("preset");
    const [selectedPeriod, setSelectedPeriod] = useState<Period>(Period.ONE_YEAR);
    const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);

    const [totalIncome, setTotalIncome] = useState<number | null>(null);
    const [totalExpense, setTotalExpense] = useState<number | null>(null);
    const [netIncome, setNetIncome] = useState<number | null>(null);

    const [transactions, setTransactions] = useState<IncomeExpenseGraphProps['data'] | undefined>(undefined);
    const [isTransactionsReady, setIsTransactionsReady] = useState<boolean>(false);
    const [expandedSection, setExpandedSection] = useState<ExpandableSection | null>(null);

    const [recentTransactionsIncludeDeposit, setRecentTransactionsIncludeDeposit] = useState<boolean>(false);

    const baseOrder: Record<ExpandableSection, string> = {
    transactionsTable: "order-1 xl:col-span-1",
    category: "order-2 xl:col-span-1",
    graph: "order-3 xl:col-span-1",
    depositTransactionsTable: "order-4 xl:col-span-1",
    recent: "order-5 xl:col-span-1",
};
const getSectionClass = (key: ExpandableSection) => expandedSection === key ? "order-first xl:col-span-2" : baseOrder[key];
const sectionRefs = useRef<Record<ExpandableSection, HTMLDivElement | null>>({
    transactionsTable: null,
    depositTransactionsTable: null,
    category: null,
    graph: null,
    recent: null,
});

    const customRangeForQuery = customRange?.from
        ? {
            startDate: customRange.from,
            endDate: customRange.to ?? customRange.from
        }
        : undefined;
    const customRangeKey = customRangeForQuery
        ? `${customRangeForQuery.startDate.toISOString()}_${customRangeForQuery.endDate.toISOString()}`
        : "none";

    const {
        data: groupedIncomeExpense,
        isLoading: isTransactionsLoading,
        isSuccess: isTransactionsSuccess,
        error: transactionsError
    } = useQuery({
        queryKey: [
            "groupedIncomeExpense",
            periodMode,
            selectedPeriod,
            customRangeForQuery?.startDate?.toISOString() ?? null,
            customRangeForQuery?.endDate?.toISOString() ?? null,
            headerContext.locationID
        ],
        queryFn: () => {
            setIsTransactionsReady(false);
            if (periodMode === "all") {
                return getGroupedIncomeExpenseAction({
                    type: "all",
                }, headerContext.locationID, true);
            }

            if (periodMode === "custom") {
                if (!customRangeForQuery) {
                    throw new Error("Pilih rentang tanggal kustom terlebih dahulu");
                }

                return getGroupedIncomeExpenseAction({
                    type: "custom",
                    range: customRangeForQuery,
                }, headerContext.locationID, true);
            }

            return getGroupedIncomeExpenseAction(selectedPeriod, headerContext.locationID, true);
        },
        enabled: periodMode !== "custom" || Boolean(customRangeForQuery),
    });

    useEffect(() => {
        setTransactions(undefined);
        setTotalIncome(null);
        setTotalExpense(null);
        setNetIncome(null);
    }, [periodMode, selectedPeriod, customRangeKey]);

    useEffect(() => {
        if (expandedSection && sectionRefs.current[expandedSection]) {
            sectionRefs.current[expandedSection]?.scrollIntoView({behavior: "smooth", block: "start"});
        }
    }, [expandedSection]);

    const {data: recentTransactions, isLoading: isRecentLoading, isSuccess: isRecentSuccess} = useQuery({
        queryKey: ["recentTransactions", headerContext.locationID, recentTransactionsIncludeDeposit],
        queryFn: () => getRecentTransactionsAction(headerContext.locationID, recentTransactionsIncludeDeposit),
    });

    // Category Breakdown
    const [selectedCategory, setSelectedCategory] = useState<TransactionType>(TransactionType.EXPENSE);
    const [categoryBreakdownData, setCategoryBreakdownData] = useState<{
        INCOME: ChartData<"pie", number[]>,
        EXPENSE: ChartData<"pie", number[]>,
    } | undefined>();

    function updateCategoryBreakdownData() {
        if (groupedIncomeExpense) {
            const allIncomeData = [...groupedIncomeExpense.incomeData.flat(), ...(groupedIncomeExpense.deposit?.income?.flat() || [])];
            const allExpensesData = [...groupedIncomeExpense.expenseData.flat(), ...(groupedIncomeExpense.deposit?.expense?.flat() || [])];

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
            setIsTransactionsReady(true);
        }
    }, [isTransactionsSuccess, groupedIncomeExpense]);

    return (
        <div className="min-h-screen pb-8 md:px-8 md:-mt-4">
            <div className="container mx-auto">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end mb-4">
                    <div
                        className={"min-h-0 h-fit border border-gray-400 rounded-md flex flex-wrap divide-x divide-gray-400 overflow-hidden"}>
                        {Object.values(Period).map((value, index) => {
                            return (
                                <span
                                    key={index}
                                    className={`whitespace-nowrap px-2 py-2 text-xs text-black font-semibold cursor-pointer transition-colors ease-in-out duration-300 overflow-clip ${
                                        periodMode === "preset" && selectedPeriod === value ? "bg-black text-white" : "bg-white"
                                    }`}
                                    onClick={() => {
                                        setPeriodMode("preset");
                                        setSelectedPeriod(value);
                                    }}
                                >
                                  {value}
                                </span>
                            );
                        })}
                        <span
                            className={`whitespace-nowrap px-2 py-2 text-xs text-black font-semibold cursor-pointer transition-colors ease-in-out duration-300 overflow-clip ${
                                periodMode === "all" ? "bg-black text-white" : "bg-white"
                            }`}
                            onClick={() => setPeriodMode("all")}
                        >
                            Semua Waktu
                        </span>
                        <span
                            className={`whitespace-nowrap px-2 py-2 text-xs text-black font-semibold cursor-pointer transition-colors ease-in-out duration-300 overflow-clip ${
                                periodMode === "custom" ? "bg-black text-white" : "bg-white"
                            }`}
                            onClick={() => setPeriodMode("custom")}
                        >
                            Periode Kustom
                        </span>
                    </div>
                    {
                        periodMode === "custom" &&
                        <DatePicker
                            initialDate={{
                                range: customRange
                            }}
                            onUpdate={({range}) => {
                                setPeriodMode("custom");
                                setCustomRange(range);
                            }}
                            placeholder="Pilih rentang tanggal"
                            searchButtonText="Terapkan"
                            showSearchButton={true}
                            className="w-full md:w-auto"
                        />
                    }
                </div>
                {
                    periodMode === "custom" && !customRangeForQuery &&
                     // @ts-expect-error weird react 19 types error
                    <Typography variant="small" className="text-gray-600 mb-2">
                        Pilih rentang tanggal kustom lalu klik tombol Terapkan untuk menerapkan.
                    </Typography>
                }
                {
                    transactionsError &&
                    // @ts-expect-error weird react 19 types error
                    <Typography variant="small" className="text-red-600 mb-2">
                        Gagal memuat ringkasan: {transactionsError instanceof Error ? transactionsError.message : "Terjadi kesalahan"}
                    </Typography>
                }

                {/* Quick Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    {/* @ts-expect-error weird react 19 types error */}
                    <Card className="bg-green-100 shadow-md p-4 rounded">
                        {/* @ts-expect-error weird react 19 types error */}
                        <CardBody>
                            {/* @ts-expect-error weird react 19 types error */}
                            <Typography variant="h6" className="font-semibold">
                                Total Pemasukan
                            </Typography>
                            {/* @ts-expect-error weird react 19 types error */}
                            <Typography variant="h4">{totalIncome ? formatToIDR(totalIncome) : "-"}</Typography>
                        </CardBody>
                    </Card>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Card className="bg-red-100 shadow-md p-4 rounded">
                        {/* @ts-expect-error weird react 19 types error */}
                        <CardBody>
                            {/* @ts-expect-error weird react 19 types error */}
                            <Typography variant="h6" className="font-semibold">
                                Total Pengeluaran
                            </Typography>
                            {/* @ts-expect-error weird react 19 types error */}
                            <Typography variant="h4">{totalExpense ? formatToIDR(totalExpense) : "-"}</Typography>
                        </CardBody>
                    </Card>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Card className="bg-blue-100 shadow-md p-4 rounded">
                        {/* @ts-expect-error weird react 19 types error */}
                        <CardBody>
                            {/* @ts-expect-error weird react 19 types error */}
                            <Typography variant="h6" className="font-semibold">
                                Pendapatan Bersih
                            </Typography>
                            {/* @ts-expect-error weird react 19 types error */}
                            <Typography variant="h4">{netIncome ? formatToIDR(netIncome) : "-"}</Typography>
                        </CardBody>
                    </Card>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8">
                    <div ref={(el) => { sectionRefs.current.transactionsTable = el; }} className={`w-full ${getSectionClass("transactionsTable")}`}>
                        {/* @ts-expect-error weird react 19 types error */}
                        <Card className="shadow-md max-h-[80dvh] h-fit overflow-auto">
                            {/* @ts-expect-error weird react 19 types error */}
                            <CardBody className="pt-0 px-8 pb-8 overflow-x-auto">
                                <div className="-mx-8 px-8 pt-8 sticky top-0 z-10 flex items-start justify-between bg-white pb-2">
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Typography variant="h5" className="font-semibold">Pemasukan & Pengeluaran</Typography>
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Button size="sm" variant="text" className="min-w-fit"
                                            aria-label={expandedSection === "transactionsTable" ? "Kembalikan" : "Perlebar"}
                                            onClick={() => setExpandedSection(expandedSection === "transactionsTable" ? null : "transactionsTable")}>
                                        {expandedSection === "transactionsTable" ? <FiMinimize2/> : <FiMaximize2/>}
                                    </Button>
                                </div>
                                {
                                    isTransactionsReady &&
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
                            {/* @ts-expect-error weird react 19 types error */}
                            <CardFooter className="p-4">
                                {/* @ts-expect-error weird react 19 types error */}
                                <Typography variant="small" className="text-gray-600">
                                    Data per tanggal: {formatToDateTime(new Date())}
                                </Typography>
                            </CardFooter>
                        </Card>
                    </div>

                    <div ref={(el) => { sectionRefs.current.category = el; }} className={`w-full ${getSectionClass("category")}`}>
                        {/* @ts-expect-error weird react 19 types error */}
                        <Card className="shadow-md max-h-[80dvh] h-fit overflow-auto">
                            {/* @ts-expect-error weird react 19 types error */}
                            <CardBody className="pt-0 px-8 pb-8 overflow-x-auto flex flex-col gap-y-6">
                                <div className="-mx-8 px-8 pt-8 sticky top-0 z-10 flex items-start justify-between bg-white pb-2">
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Typography variant="h5" className="font-semibold">Rincian Kategori</Typography>
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Button size="sm" variant="text" className="min-w-fit"
                                            aria-label={expandedSection === "category" ? "Kembalikan" : "Perlebar"}
                                            onClick={() => setExpandedSection(expandedSection === "category" ? null : "category")}>
                                        {expandedSection === "category" ? <FiMinimize2/> : <FiMaximize2/>}
                                    </Button>
                                </div>
                                <div className={"flex gap-x-2 overflow-x-auto flex-shrink-0"}>
                                    {Object.keys(TransactionType).map(t => (
                                        <>
                                            {/* @ts-expect-error weird react 19 types error */}
                                            <Button key={t} variant={selectedCategory == t ? 'filled' : 'outlined'}
                                                    size={"sm"}
                                                    className={"min-h-fit min-w-fit rounded-full whitespace-nowrap"}
                                                    onClick={() => setSelectedCategory(t as TransactionType)}>
                                                {t}
                                            </Button>
                                        </>
                                    ))}
                                </div>
                                <div className={"flex flex-shrink items-center justify-center px-8"}>
                                    {
                                        isTransactionsReady && (
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
                                                : /* @ts-expect-error weird react 19 types error */
                                                <Typography>Tidak ada data kategori.</Typography>
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

                    <div ref={(el) => { sectionRefs.current.graph = el; }} className={`w-full ${getSectionClass("graph")}`}>
                        {/* @ts-expect-error weird react 19 types error */}
                        <Card className="shadow-md max-h-[80dvh] h-fit overflow-auto">
                            {/* @ts-expect-error weird react 19 types error */}
                            <CardBody className="pt-0 px-8 pb-8 overflow-x-auto">
                                <div className="-mx-8 px-8 pt-8 sticky top-0 z-10 flex items-start justify-between bg-white pb-2">
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Typography variant="h5" className="font-semibold">Grafik Pemasukan & Pengeluaran</Typography>
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Button size="sm" variant="text" className="min-w-fit"
                                            aria-label={expandedSection === "graph" ? "Kembalikan" : "Perlebar"}
                                            onClick={() => setExpandedSection(expandedSection === "graph" ? null : "graph")}>
                                        {expandedSection === "graph" ? <FiMinimize2/> : <FiMaximize2/>}
                                    </Button>
                                </div>
                                <IncomeExpenseGraph
                                    showPeriodPicker={false}
                                    isSuccess={isTransactionsReady}
                                    isLoading={isTransactionsLoading}
                                    data={transactions}
                                    period={undefined}
                                    setPeriod={undefined}
                                />
                            </CardBody>
                        </Card>
                    </div>

                    <div ref={(el) => { sectionRefs.current.depositTransactionsTable = el; }} className={`w-full ${getSectionClass("depositTransactionsTable")}`}>
                        {/* @ts-expect-error weird react 19 types error */}
                        <Card className="shadow-md max-h-[80dvh] h-fit overflow-auto">
                            {/* @ts-expect-error weird react 19 types error */}
                            <CardBody className="pt-0 px-8 pb-8 overflow-x-auto">
                                <div className="-mx-8 px-8 pt-8 sticky top-0 z-10 flex items-start justify-between bg-white pb-2">
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Typography variant="h5" className="font-semibold">Pemasukan & Pengeluaran (Deposit)</Typography>
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Button size="sm" variant="text" className="min-w-fit"
                                            aria-label={expandedSection === "depositTransactionsTable" ? "Kembalikan" : "Perlebar"}
                                            onClick={() => setExpandedSection(expandedSection === "depositTransactionsTable" ? null : "depositTransactionsTable")}>
                                        {expandedSection === "depositTransactionsTable" ? <FiMinimize2/> : <FiMaximize2/>}
                                    </Button>
                                </div>
                                {
                                    isTransactionsReady && transactions!.deposit &&
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
                                                    <td className="px-4 py-2 border">{formatToIDR(transactions.deposit!.income[idx])}</td>
                                                    <td className="px-4 py-2 border">{formatToIDR(transactions.deposit!.expense[idx])}</td>
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
                            {/* @ts-expect-error weird react 19 types error */}
                            <CardFooter className="p-4">
                                {/* @ts-expect-error weird react 19 types error */}
                                <Typography variant="small" className="text-gray-600">
                                    Data per tanggal: {formatToDateTime(new Date())}
                                </Typography>
                            </CardFooter>
                        </Card>
                    </div>

                    <div ref={(el) => { sectionRefs.current.recent = el; }} className={`w-full ${getSectionClass("recent")}`}>
                        {/* @ts-expect-error weird react 19 types error */}
                        <Card className="shadow-md max-h-[80dvh] h-fit overflow-auto">
                            {/* @ts-expect-error weird react 19 types error */}
                            <CardBody className="pt-0 px-8 pb-8 w-full">
                                <div className="-mx-8 px-8 pt-8 sticky top-0 z-10 flex items-start justify-between bg-white pb-2">
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Typography variant="h5" className="font-semibold">Transaksi Terbaru</Typography>
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Button size="sm" variant="text" className="min-w-fit"
                                            aria-label={expandedSection === "recent" ? "Kembalikan" : "Perlebar"}
                                            onClick={() => setExpandedSection(expandedSection === "recent" ? null : "recent")}>
                                        {expandedSection === "recent" ? <FiMinimize2/> : <FiMaximize2/>}
                                    </Button>
                                </div>
                                <div className={"flex gap-x-2 overflow-x-auto flex-shrink-0"}>
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Button variant={recentTransactionsIncludeDeposit ? 'filled' : 'outlined'}
                                            size={"sm"}
                                            className={"min-h-fit min-w-fit rounded-full whitespace-nowrap"}
                                            onClick={() => setRecentTransactionsIncludeDeposit(true)}>
                                        Dengan Deposit
                                    </Button>
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Button variant={!recentTransactionsIncludeDeposit ? 'filled' : 'outlined'}
                                            size={"sm"}
                                            className={"min-h-fit min-w-fit rounded-full whitespace-nowrap"}
                                            onClick={() => setRecentTransactionsIncludeDeposit(false)}>
                                        Tanpa Deposit
                                    </Button>
                                </div>
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
                                                            <td className="px-4 py-2 border">{formatToDateTime(new Date(txn.date), false, false)}</td>
                                                            <td className="px-4 py-2 border">{txn.description}</td>
                                                            <td className="px-4 py-2 border">{formatToIDR(new Prisma.Decimal(txn.amount).toNumber())}</td>
                                                            <td className="px-4 py-2 border">{txn.type}</td>
                                                        </tr>
                                                    ))}
                                                    </tbody>
                                                </table>
                                                : /* @ts-expect-error weird react 19 types error */
                                                <Typography>Tidak ada transaksi baru.</Typography>
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
