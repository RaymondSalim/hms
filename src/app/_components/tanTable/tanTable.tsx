import {Table} from "@tanstack/table-core";
import {Button, Checkbox, Input, Popover, PopoverContent, PopoverHandler, Typography} from "@material-tailwind/react";
import {flexRender} from "@tanstack/react-table";
import {MdDelete, MdEdit, MdFilterList, MdKeyboardArrowRight} from "react-icons/md";
import React, {MouseEventHandler, useEffect, useState} from "react";
import styles from "./tanTable.module.css";
import {TiArrowSortedDown, TiArrowSortedUp} from "react-icons/ti";
import {rankItem} from '@tanstack/match-sorter-utils';
import {AnimatePresence, motion} from "framer-motion";

export interface TanTableProps {
    tanTable: Table<any>
}

export default function TanTable({tanTable}: TanTableProps) {
    const [selectedValues, setSelectedValues] = useState<{ [key: string]: string[] }>({});
    const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});
    const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

    // Initialize filter state when a column is enabled for filtering
    useEffect(() => {
        const filterableColumns = tanTable.getAllColumns().filter(col => col.getCanFilter());
        const initialSelectedValues: { [key: string]: string[] } = {};
        const initialSearchTerms: { [key: string]: string } = {};

        filterableColumns.forEach(col => {
            const currentFilter = col.getFilterValue() as string;
            if (currentFilter) {
                initialSelectedValues[col.id] = currentFilter.split(',');
            } else {
                initialSelectedValues[col.id] = [];
            }
            initialSearchTerms[col.id] = '';
        });

        setSelectedValues(initialSelectedValues);
        setSearchTerms(initialSearchTerms);
    }, [tanTable]);

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

    // Custom filter function
    const customFilter = (row: any, columnId: string, filterValue: string) => {
        if (!filterValue) return true;
        const selectedValues = filterValue.split(',');
        const value = String(row.getValue(columnId));
        return selectedValues.includes(value);
    };

    // Apply custom filter function to all filterable columns
    useEffect(() => {
        tanTable.getAllColumns().forEach(column => {
            if (column.getCanFilter()) {
                column.columnDef.filterFn = customFilter;
            }
        });
    }, [tanTable]);

    // Update selected values when filter changes
    useEffect(() => {
        tanTable.getAllColumns().forEach(column => {
            if (column.getCanFilter()) {
                const currentFilter = column.getFilterValue() as string;
                if (currentFilter) {
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
                    {isGrouping && <th className={styles.th} style={{width: 32}}></th>}
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
                                    header.column.getCanFilter() && (
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
                                            <PopoverContent className="w-80 z-[100]">
                                                <div className="mb-4">
                                                    <Input
                                                        type="text"
                                                        value={searchTerms[header.id] || ''}
                                                        onChange={(e) => setSearchTerms(prev => ({
                                                            ...prev,
                                                            [header.id]: e.target.value
                                                        }))}
                                                        className={styles.filterInput}
                                                        placeholder="Search values..."
                                                        label="Search"
                                                    />
                                                </div>

                                                <div className="max-h-[200px] overflow-y-auto">
                                                    {/* Selected values section */}
                                                    {fuzzySearch(getUniqueValues(header.id), searchTerms[header.id] || '')
                                                        .filter(val => (selectedValues[header.id] || []).includes(val))
                                                        .map((val) => (
                                                            <div key={val} className="flex items-center gap-2 py-1">
                                                                <Checkbox
                                                                    checked={true}
                                                                    onChange={(e) => {
                                                                        const currentSelected = selectedValues[header.id] || [];
                                                                        setSelectedValues(prev => ({
                                                                            ...prev,
                                                                            [header.id]: currentSelected.filter(v => v !== val)
                                                                        }));
                                                                    }}
                                                                />
                                                                <span className="text-sm">{val}</span>
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
                                                                <Checkbox
                                                                    checked={false}
                                                                    onChange={(e) => {
                                                                        const currentSelected = selectedValues[header.id] || [];
                                                                        setSelectedValues(prev => ({
                                                                            ...prev,
                                                                            [header.id]: [...currentSelected, val]
                                                                        }));
                                                                    }}
                                                                />
                                                                <span className="text-sm">{val}</span>
                                                            </div>
                                                        ))}
                                                </div>

                                                <div className={styles.filterActions}>
                                                    <Button
                                                        variant="outlined"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedValues(prev => ({...prev, [header.id]: []}));
                                                            setSearchTerms(prev => ({...prev, [header.id]: ''}));
                                                            header.column.setFilterValue(undefined);
                                                            setOpenPopoverId(null);
                                                        }}
                                                    >
                                                        Clear
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            const values = selectedValues[header.id] || [];
                                                            header.column.setFilterValue(values.length > 0 ? values.join(",") : undefined);
                                                            setOpenPopoverId(null);
                                                        }}
                                                    >
                                                        Apply
                                                    </Button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    )
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
                          initial={{ opacity: row.getIsGrouped() ? 0 : 1 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
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
                                              initial={{ height: isGrouping ? 0 : "auto" }}
                                              animate={{ height: "auto" }}
                                              exit={{ height: isGrouping ? 0 : "auto" }}
                                              transition={{ duration: 0.25 }}
                                              style={{ overflow: "hidden" }}
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
