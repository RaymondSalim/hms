import {smartFilterFn, SupportedFilterValue} from "@/app/_components/tanTable/tanTable";

const makeRow = (value: unknown, filterType?: string, columnId: string = "col") => ({
    getValue: () => value,
    getAllCells: () => [{
        column: {
            id: columnId,
            columnDef: {
                meta: filterType ? {filterType} : undefined,
            },
        },
    }],
});

describe("smartFilterFn", () => {
    it("handles date range filter objects safely", () => {
        const row = makeRow("2025-04-15", "dateRange", "date");
        const filterValue: SupportedFilterValue = {kind: "dateRange", from: "2025-04-01", to: "2025-05-01"};

        expect(() => smartFilterFn(row as any, "date", filterValue)).not.toThrow();
        expect(smartFilterFn(row as any, "date", filterValue)).toBe(true);
    });

    it("returns false when value is outside the date range", () => {
        const row = makeRow("2025-06-01", "dateRange", "date");
        const filterValue: SupportedFilterValue = {kind: "dateRange", from: "2025-04-01", to: "2025-05-01"};

        expect(smartFilterFn(row as any, "date", filterValue)).toBe(false);
    });

    it("falls back to string contains matching", () => {
        const row = makeRow("Jakarta Barat");

        expect(smartFilterFn(row as any, "city", "jakarta")).toBe(true);
        expect(smartFilterFn(row as any, "city", "surabaya")).toBe(false);
    });
});
