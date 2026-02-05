"use client";

import {useQuery} from "@tanstack/react-query";
import {getGroupedIncomeExpense} from "@/app/_db/dashboard";
import {useEffect, useState} from "react";
import {Period} from "@/app/_enum/financial";
import {useHeader} from "@/app/_context/HeaderContext";
import IncomeExpenseGraph, {IncomeExpenseGraphProps} from "@/app/_components/financials/income-expense-graph";
import {convertGroupedTransactionsToTotals} from "@/app/_lib/util";

export default function FinancialGraph() {
    const headerContext = useHeader();
    const [selectedPeriod, setSelectedPeriod] = useState<Period>(Period.ONE_YEAR);
    const [transactions, setTransactions] = useState<IncomeExpenseGraphProps['data'] | undefined>(undefined);

    const {
        data,
        isLoading,
        isSuccess,
    } = useQuery({
        queryKey: ["groupedIncomeExpense", selectedPeriod, headerContext.locationID],
        queryFn: () => getGroupedIncomeExpense(selectedPeriod, headerContext.locationID, true),
    });

    useEffect(() => {
        if (isSuccess) {
            setTransactions(convertGroupedTransactionsToTotals(data));
        }
    }, [data, isSuccess]);

    return (
            <div>
                <IncomeExpenseGraph
                    isSuccess={isSuccess}
                    isLoading={isLoading}
                    showPeriodPicker={true}
                    period={selectedPeriod}
                    setPeriod={setSelectedPeriod}
                    data={transactions}
                    title={
                        <h2 className={"contents"}>Keuangan</h2>
                    }
                />
            </div>
    );
}
