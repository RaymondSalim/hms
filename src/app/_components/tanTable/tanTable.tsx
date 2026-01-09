import {Table} from "@tanstack/table-core";
import {Button, Checkbox, Input, Popover, PopoverContent, PopoverHandler, Typography} from "@material-tailwind/react";
import {flexRender} from "@tanstack/react-table";
import {MdDelete, MdEdit, MdFilterList, MdKeyboardArrowRight} from "react-icons/md";
import React, {MouseEventHandler, useEffect, useState} from "react";
import styles from "./tanTable.module.css";
import {TiArrowSortedDown, TiArrowSortedUp} from "react-icons/ti";
import {rankItem} from '@tanstack/match-sorter-utils';
import {AnimatePresence, motion} from "framer-motion";

export type FilterType =
    | "enumMulti"
    | "numberRange"
    | "currencyRange"
    | "idRange"
    | "dateRange"
    | "boolean";

type EnumMultiFilterValue = { kind: "enumMulti", values: string[] };
type RangeFilterValue = { kind: "range", min?: string, max?: string };
type DateRangeFilterValue = { kind: "dateRange", from?: string, to?: string };
type BooleanFilterValue = { kind: "boolean", value?: boolean };

type SupportedFilterValue =
    | EnumMultiFilterValue
    | RangeFilterValue
    | DateRangeFilterValue
    | BooleanFilterValue
    | string
    | undefined;

const isLegacyFilterType = (filterType?: FilterType) => {
    // Legacy path keeps the existing value-list checkbox UX
    return !filterType || filterType === "enumMulti";
};

const getDefaultFilterValue = (filterType: FilterType): SupportedFilterValue => {
    switch (filterType) {
        case "enumMulti":
            return {kind: "enumMulti", values: []};
        case "numberRange":
        case "currencyRange":
        case "idRange":
            return {kind: "range", min: "", max: ""};
        case "dateRange":
            return {kind: "dateRange", from: "", to: ""};
        case "boolean":
            return {kind: "boolean", value: undefined};
        default:
            return undefined;
    }
};

const coerceNumber = (val: unknown): number | null => {
    if (val === undefined || val === null || val === "") return null;
    const num = Number(val);
    return Number.isNaN(num) ? null : num;
};

const applyFilterPredicate = (cellValue: unknown, filterValue: SupportedFilterValue, filterType?: FilterType) => {
    if (!filterValue) return true;

    // Legacy: comma separated string of values
    if (isLegacyFilterType(filterType) && typeof filterValue === "string") {
        const selectedValues = filterValue.split(',').filter(Boolean);
        if (selectedValues.length === 0) return true;
        return selectedValues.includes(String(cellValue));
    }

    if (typeof filterValue === "string") {
        // Defensive fallback: behaves like text contains
        return String(cellValue ?? "").toLowerCase().includes(filterValue.toLowerCase());
    }

    switch (filterValue.kind) {
        case "enumMulti": {
            if (!filterValue.values || filterValue.values.length === 0) return true;
            return filterValue.values.includes(String(cellValue));
        }
        case "range": {
            const v = coerceNumber(cellValue);
            if (v === null) return false;
            const min = coerceNumber(filterValue.min);
            const max = coerceNumber(filterValue.max);
            if (min !== null && v < min) return false;
            if (max !== null && v > max) return false;
            return true;
        }
        case "dateRange": {
            if (!cellValue) return false;
            const valueDate = new Date(cellValue as any);
            if (Number.isNaN(valueDate.getTime())) return false;
            if (filterValue.from) {
                const fromDate = new Date(filterValue.from as any);
                if (valueDate < fromDate) return false;
            }
            if (filterValue.to) {
                const toDate = new Date(filterValue.to as any);
                if (valueDate > toDate) return false;
            }
            return true;
        }
        case "boolean": {
            if (filterValue.value === undefined) return true;
            const boolValue = Boolean(cellValue);
            return boolValue === filterValue.value;
        }
        default:
            return true;
    }
};

export interface TanTableProps {
    tanTable: Table<any>
    valueLabelMapping?: { [columnId: string]: { [value: string]: string } }
}

export default function TanTable({tanTable, valueLabelMapping}: TanTableProps) {
    const [selectedValues, setSelectedValues] = useState<{ [key: string]: string[] }>({});
    const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});
    const [typedFilterDrafts, setTypedFilterDrafts] = useState<{ [key: string]: SupportedFilterValue }>({});
    const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

    // Initialize filter state when a column is enabled for filtering
    useEffect(() => {
        const filterableColumns = tanTable.getAllColumns().filter(col => col.getCanFilter());
        const initialSelectedValues: { [key: string]: string[] } = {};
        const initialSearchTerms: { [key: string]: string } = {};
        const initialTypedDrafts: { [key: string]: SupportedFilterValue } = {};

        filterableColumns.forEach(col => {
            const filterType: FilterType | undefined = (col.columnDef.meta as any)?.filterType;
            const currentFilter = col.getFilterValue() as SupportedFilterValue;

            if (isLegacyFilterType(filterType)) {
                if (typeof currentFilter === "string" && currentFilter) {
                    initialSelectedValues[col.id] = currentFilter.split(',');
                } else {
                    initialSelectedValues[col.id] = [];
                }
            } else if (filterType) {
                initialTypedDrafts[col.id] = currentFilter ?? getDefaultFilterValue(filterType);
            }
            initialSearchTerms[col.id] = '';
        });

        setSelectedValues(initialSelectedValues);
        setSearchTerms(initialSearchTerms);
        setTypedFilterDrafts(initialTypedDrafts);
    }, [tanTable]);

    // Get display label for a value
    const getDisplayLabel = (columnId: string, value: string) => {
        if (valueLabelMapping && valueLabelMapping[columnId] && valueLabelMapping[columnId][value]) {
            return valueLabelMapping[columnId][value];
        }
        return value;
    };

    // Get unique values for the column
    const getUniqueValues = (columnId: string) => {
        const values = new Set<string>();
        // Use the table's data directly to get all rows
        tanTable.getCoreRowModel().rows.forEach(row => {
            const value = row.getValue(columnId);
            if (value !== undefined && value !== null) {
                values.add(String(value));
            }
        });
        return Array.from(values).sort();
    };

    // Apply dynamic filter function to all filterable columns
    useEffect(() => {
        tanTable.getAllColumns().forEach(column => {
            if (!column.getCanFilter()) return;
            const filterType: FilterType | undefined = (column.columnDef.meta as any)?.filterType;
            column.columnDef.filterFn = (row, columnId, filterValue) => {
                return applyFilterPredicate(row.getValue(columnId), filterValue as SupportedFilterValue, filterType);
            };
        });
    }, [tanTable]);

    // Update selected values when filter changes
    useEffect(() => {
        tanTable.getAllColumns().forEach(column => {
            if (!column.getCanFilter()) return;
            const filterType: FilterType | undefined = (column.columnDef.meta as any)?.filterType;
            const currentFilter = column.getFilterValue() as SupportedFilterValue;

            if (isLegacyFilterType(filterType)) {
                if (typeof currentFilter === "string" && currentFilter) {
                    setSelectedValues(prev => ({
                        ...prev,
                        [column.id]: currentFilter.split(',')
                    }));
                } else {
                    setSelectedValues(prev => ({
                        ...prev,
                        [column.id]: []
                    }));
                }
            } else if (filterType) {
                setTypedFilterDrafts(prev => ({
                    ...prev,
                    [column.id]: currentFilter ?? getDefaultFilterValue(filterType)
                }));
            }
        });
    }, [tanTable.getState().columnFilters]);

    // Fuzzy search function
    const fuzzySearch = (items: string[], searchTerm: string) => {
        if (!searchTerm) return items;

        return items
            .map(item => ({
                item,
                rank: rankItem(item, searchTerm)
            }))
            .filter(({rank}) => rank.passed)
            .sort((a, b) => a.rank.rank - b.rank.rank)
            .map(({item}) => item);
    };

    // Only one group expanded at a time
    const handleGroupExpand = (row: any) => {
        if (row.getIsExpanded()) {
            tanTable.setExpanded({}); // collapse all
        } else {
            tanTable.setExpanded({[row.id]: true}); // expand only this group
        }
    };

    // Detect if grouping is enabled
    const isGrouping = (tanTable.getState().grouping?.length ?? 0) > 0;

    return (
        <table className={styles.table}>
            <thead className={styles.thead}>
            {tanTable.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                    {/* Expander header if grouping is enabled */}
                    {isGrouping && <th className={styles.th} style={{width: 24}}></th>}
                    {headerGroup.headers.map(header => (
                        <th
                            key={header.id}
                            colSpan={header.colSpan}
                            style={{
                                width: header.getSize() !== 0 ? header.getSize() : undefined,
                            }}
                            className={`${styles.th}`}
                        >
                            <div className={styles.thContent}>
                                <div
                                    className={`flex gap-x-1 items-center text-blue-gray-300 ${header.column.getCanSort() ? "cursor-pointer" : ""}`}
                                    onClick={header.column.getToggleSortingHandler()}
                                >
                                    {/* @ts-expect-error weird react 19 types error */}
                                    <Typography
                                        variant="small"
                                        color="blue-gray"
                                        className={styles.typography}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </Typography>
                                    {{
                                        asc: <TiArrowSortedUp/>,
                                        desc: <TiArrowSortedDown/>,
                                    }[header.column.getIsSorted() as string] ?? null}
                                </div>
                                {
                                    header.column.getCanFilter() && (() => {
                                        const filterType: FilterType | undefined = (header.column.columnDef.meta as any)?.filterType;
                                        const legacyMode = isLegacyFilterType(filterType);
                                        const typedDraft = filterType ? (typedFilterDrafts[header.id] ?? getDefaultFilterValue(filterType)) : undefined;

                                        const renderLegacyFilter = () => (
                                            <>
                                                <div className="mb-4">
                                                    {/* @ts-expect-error weird react 19 types error */}
                                                    <Input
                                                        type="text"
                                                        value={searchTerms[header.id] || ''}
                                                        onChange={(e) => setSearchTerms(prev => ({
                                                            ...prev,
                                                            [header.id]: e.target.value
                                                        }))}
                                                        className={styles.filterInput}
                                                        placeholder="Cari nilai..."
                                                        label="Cari"
                                                    />
                                                </div>

                                                <div className="max-h-[200px] overflow-y-auto">
                                                    {/* Selected values section */}
                                                    {fuzzySearch(getUniqueValues(header.id), searchTerms[header.id] || '')
                                                        .filter(val => (selectedValues[header.id] || []).includes(val))
                                                        .map((val) => (
                                                            <div key={val} className="flex items-center gap-2 py-1">
                                                                {/* @ts-expect-error weird react 19 types error */}
                                                                <Checkbox
                                                                    checked={true}
                                                                    onChange={() => {
                                                                        const currentSelected = selectedValues[header.id] || [];
                                                                        setSelectedValues(prev => ({
                                                                            ...prev,
                                                                            [header.id]: currentSelected.filter(v => v !== val)
                                                                        }));
                                                                    }}
                                                                />
                                                                <span
                                                                    className="text-sm">{getDisplayLabel(header.id, val)}</span>
                                                            </div>
                                                        ))}

                                                    {/* Divider if there are both selected and unselected values */}
                                                    {selectedValues[header.id]?.length > 0 &&
                                                        fuzzySearch(getUniqueValues(header.id), searchTerms[header.id] || '')
                                                            .some(val => !(selectedValues[header.id] || []).includes(val)) && (
                                                            <div className="border-b border-gray-200 my-2"/>
                                                        )}

                                                    {/* Unselected values section */}
                                                    {fuzzySearch(getUniqueValues(header.id), searchTerms[header.id] || '')
                                                        .filter(val => !(selectedValues[header.id] || []).includes(val))
                                                        .map((val) => (
                                                            <div key={val} className="flex items-center gap-2 py-1">
                                                                {/* @ts-expect-error weird react 19 types error */}
                                                                <Checkbox
                                                                    checked={false}
                                                                    onChange={() => {
                                                                        const currentSelected = selectedValues[header.id] || [];
                                                                        setSelectedValues(prev => ({
                                                                            ...prev,
                                                                            [header.id]: [...currentSelected, val]
                                                                        }));
                                                                    }}
                                                                />
                                                                <span
                                                                    className="text-sm">{getDisplayLabel(header.id, val)}</span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </>
                                        );

                                        const renderEnumLike = (draft: EnumMultiFilterValue) => {
                                            const options = fuzzySearch(getUniqueValues(header.id), searchTerms[header.id] || '');
                                            const selected = new Set(draft.values || []);
                                            const toggleValue = (val: string) => {
                                                setTypedFilterDrafts(prev => ({
                                                    ...prev,
                                                    [header.id]: {
                                                        kind: "enumMulti",
                                                        values: selected.has(val)
                                                            ? draft.values.filter(v => v !== val)
                                                            : [...draft.values, val]
                                                    }
                                                }));
                                            };
                                            return (
                                                <>
                                                    <div className="mb-4">
                                                        {/* @ts-expect-error weird react 19 types error */}
                                                        <Input
                                                            type="text"
                                                            value={searchTerms[header.id] || ''}
                                                            onChange={(e) => setSearchTerms(prev => ({
                                                                ...prev,
                                                                [header.id]: e.target.value
                                                            }))}
                                                            className={styles.filterInput}
                                                            placeholder="Cari nilai..."
                                                            label="Cari"
                                                        />
                                                    </div>
                                                    <div className="max-h-[200px] overflow-y-auto flex flex-col gap-1">
                                                        {options.map(val => (
                                                            <div key={val} className="flex items-center gap-2 py-1">
                                                                {/* @ts-expect-error weird react 19 types error */}
                                                                <Checkbox
                                                                    checked={selected.has(val)}
                                                                    onChange={() => toggleValue(val)}
                                                                />
                                                                <span
                                                                    className="text-sm">{getDisplayLabel(header.id, val)}</span>
                                                            </div>
                                                        ))}
                                                        {options.length === 0 && (
                                                            <span className="text-sm text-gray-500">Tidak ada hasil</span>
                                                        )}
                                                    </div>
                                                </>
                                            );
                                        };

                                        const renderTypedFilter = () => {
                                            if (!filterType) return null;

                                            if (filterType === "enumMulti" &&
                                                typedDraft && typeof typedDraft !== "string" && (typedDraft as EnumMultiFilterValue).kind === "enumMulti") {
                                                return renderEnumLike(typedDraft as EnumMultiFilterValue);
                                            }

                                            if ((filterType === "numberRange" || filterType === "currencyRange" || filterType === "idRange") &&
                                                typedDraft && typeof typedDraft !== "string" && (typedDraft as RangeFilterValue).kind === "range") {
                                                const draft = typedDraft as RangeFilterValue;
                                                return (
                                                    <div className="flex flex-col gap-4">
                                                        {/* @ts-expect-error weird react 19 types error */}
                                                        <Input
                                                            type="number"
                                                            label="Min"
                                                            value={draft.min ?? ""}
                                                            onChange={(e) => {
                                                                setTypedFilterDrafts(prev => ({
                                                                    ...prev,
                                                                    [header.id]: {...draft, min: e.target.value}
                                                                }));
                                                            }}
                                                        />
                                                        {/* @ts-expect-error weird react 19 types error */}
                                                        <Input
                                                            type="number"
                                                            label="Max"
                                                            value={draft.max ?? ""}
                                                            onChange={(e) => {
                                                                setTypedFilterDrafts(prev => ({
                                                                    ...prev,
                                                                    [header.id]: {...draft, max: e.target.value}
                                                                }));
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            }

                                            if (filterType === "dateRange" &&
                                                typedDraft && typeof typedDraft !== "string" && (typedDraft as DateRangeFilterValue).kind === "dateRange") {
                                                const draft = typedDraft as DateRangeFilterValue;
                                                return (
                                                    <div className="flex flex-col gap-4">
                                                        {/* @ts-expect-error weird react 19 types error */}
                                                        <Input
                                                            type="date"
                                                            label="Dari"
                                                            value={draft.from ?? ""}
                                                            onChange={(e) => {
                                                                setTypedFilterDrafts(prev => ({
                                                                    ...prev,
                                                                    [header.id]: {...draft, from: e.target.value}
                                                                }));
                                                            }}
                                                        />
                                                        {/* @ts-expect-error weird react 19 types error */}
                                                        <Input
                                                            type="date"
                                                            label="Sampai"
                                                            value={draft.to ?? ""}
                                                            onChange={(e) => {
                                                                setTypedFilterDrafts(prev => ({
                                                                    ...prev,
                                                                    [header.id]: {...draft, to: e.target.value}
                                                                }));
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            }

                                            if (filterType === "boolean" &&
                                                typedDraft && typeof typedDraft !== "string" && (typedDraft as BooleanFilterValue).kind === "boolean") {
                                                const draft = typedDraft as BooleanFilterValue;
                                                return (
                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex gap-2">
                                                            {/* @ts-expect-error weird react 19 types error */}
                                                            <Button
                                                                size="sm"
                                                                variant={draft.value === undefined ? "filled" : "outlined"}
                                                                onClick={() => {
                                                                    setTypedFilterDrafts(prev => ({
                                                                        ...prev,
                                                                        [header.id]: {...draft, value: undefined}
                                                                    }));
                                                                }}
                                                            >
                                                                Semua
                                                            </Button>
                                                            {/* @ts-expect-error weird react 19 types error */}
                                                            <Button
                                                                size="sm"
                                                                variant={draft.value === true ? "filled" : "outlined"}
                                                                onClick={() => {
                                                                    setTypedFilterDrafts(prev => ({
                                                                        ...prev,
                                                                        [header.id]: {...draft, value: true}
                                                                    }));
                                                                }}
                                                            >
                                                                Ada
                                                            </Button>
                                                            {/* @ts-expect-error weird react 19 types error */}
                                                            <Button
                                                                size="sm"
                                                                variant={draft.value === false ? "filled" : "outlined"}
                                                                onClick={() => {
                                                                    setTypedFilterDrafts(prev => ({
                                                                        ...prev,
                                                                        [header.id]: {...draft, value: false}
                                                                    }));
                                                                }}
                                                            >
                                                                Tidak Ada
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return null;
                                        };

                                        const handleApply = () => {
                                            if (legacyMode) {
                                                const values = selectedValues[header.id] || [];
                                                header.column.setFilterValue(values.length > 0 ? values.join(",") : undefined);
                                            } else if (filterType) {
                                                const draft = typedFilterDrafts[header.id] ?? getDefaultFilterValue(filterType);

                                                const shouldClear = (() => {
                                                    if (typeof draft === "string") return draft.trim() === "";
                                                    switch (draft?.kind) {
                                                        case "enumMulti":
                                                            return !draft.values || draft.values.length === 0;
                                                        case "range":
                                                            return !draft.min && !draft.max;
                                                        case "dateRange":
                                                            return !draft.from && !draft.to;
                                                        case "boolean":
                                                            return draft.value === undefined;
                                                        default:
                                                            return false;
                                                    }
                                                })();

                                                header.column.setFilterValue(shouldClear ? undefined : draft);
                                            }
                                            setOpenPopoverId(null);
                                        };

                                        const handleClear = () => {
                                            if (legacyMode) {
                                                setSelectedValues(prev => ({...prev, [header.id]: []}));
                                                setSearchTerms(prev => ({...prev, [header.id]: ''}));
                                            } else if (filterType) {
                                                setTypedFilterDrafts(prev => ({
                                                    ...prev,
                                                    [header.id]: getDefaultFilterValue(filterType)
                                                }));
                                            }
                                            header.column.setFilterValue(undefined);
                                            setOpenPopoverId(null);
                                        };

                                        return (
                                            <Popover
                                                open={openPopoverId === header.id}
                                                handler={() => setOpenPopoverId(openPopoverId === header.id ? null : header.id)}
                                                placement="bottom"
                                                dismiss={{outsidePress: true}}
                                                animate={{
                                                    mount: {scale: 1, y: 0},
                                                    unmount: {scale: 0, y: 25},
                                                }}
                                            >
                                                <PopoverHandler>
                                                    <div>
                                                        <MdFilterList
                                                            className={`${styles.filterIcon} ${header.column.getFilterValue() ? styles.filterIconActive : ''}`}
                                                        />
                                                    </div>
                                                </PopoverHandler>
                                                {/* @ts-expect-error weird react 19 types error */}
                                                <PopoverContent className="w-80 z-[100]">
                                                    {legacyMode ? renderLegacyFilter() : renderTypedFilter()}

                                                    <div className={styles.filterActions}>
                                                        {/* @ts-expect-error weird react 19 types error */}
                                                        <Button
                                                            variant="outlined"
                                                            size="sm"
                                                            onClick={handleClear}
                                                        >
                                                            Bersihkan
                                                        </Button>
                                                        {/* @ts-expect-error weird react 19 types error */}
                                                        <Button
                                                            size="sm"
                                                            onClick={handleApply}
                                                        >
                                                            Terapkan
                                                        </Button>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        );
                                    })()
                                }
                            </div>
                        </th>
                    ))}
                </tr>
            ))}
            </thead>
            <tbody>
            <AnimatePresence>
                {tanTable.getRowModel().rows.map((row) => (
                    <React.Fragment key={row.id}>
                        <motion.tr
                            key={row.id}
                            className={styles.tr}
                            initial={{opacity: row.getIsGrouped() ? 0 : 1}}
                            animate={{opacity: 1}}
                            exit={{opacity: 0}}
                            transition={{duration: 0.25}}
                        >
                            {
                                isGrouping && (
                                    <td className={styles.td} style={{width: 32}}>
                                        {row.getIsGrouped?.() ? (
                                            <button onClick={() => handleGroupExpand(row)} style={{
                                                cursor: 'pointer',
                                                background: 'none',
                                                border: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: 0
                                            }}>
                                                <motion.span
                                                    animate={{rotate: row.getIsExpanded?.() ? 90 : 0}}
                                                    transition={{duration: 0.2}}
                                                    style={{display: 'inline-flex', alignItems: 'center', color: 'black'}}
                                                >
                                                    <MdKeyboardArrowRight size={22}/>
                                                </motion.span>
                                            </button>
                                        ) : null}
                                    </td>
                                )
                            }
                            {
                                row.getIsGrouped?.() ? (
                                    <td colSpan={row.getVisibleCells().length} className={styles.td}>
                                        <strong className={styles.groupHeader}>
                                            {row.groupingColumnId ? row.getValue(row.groupingColumnId) : ''}
                                        </strong>
                                    </td>
                                ) : (
                                    row.getVisibleCells().map(cell => {
                                        return (
                                            <td
                                                key={cell.id}
                                                className={styles.td}
                                                style={{
                                                    width:
                                                        cell.column.getSize() !== 0
                                                            ? cell.column.getSize()
                                                            : undefined,
                                                }}
                                            >
                                                <motion.div
                                                    initial={{height: isGrouping ? 0 : "auto"}}
                                                    animate={{height: "auto"}}
                                                    exit={{height: isGrouping ? 0 : "auto"}}
                                                    transition={{duration: 0.25}}
                                                    style={{overflow: "hidden"}}
                                                >
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </motion.div>
                                            </td>
                                        );
                                    })
                                )
                            }
                        </motion.tr>
                    </React.Fragment>
                ))}
            </AnimatePresence>
            </tbody>
        </table>
    );
}

export interface RowActionProps {
    edit: MouseEventHandler<SVGElement>
    delete: MouseEventHandler<SVGElement>
}

export function RowAction(props: RowActionProps) {
    return (
        <div className={styles.rowAction}>
            <MdEdit data-action={"edit"} onClick={props.edit}/>
            <MdDelete data-action={"delete"} className={"!hover:text-red-500"} onClick={props.delete}/>
        </div>
    );
}

