import {
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
	SortingState,
} from "@tanstack/react-table";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { DataTableProps, DataTableColumn } from "./types";
import { FilterDropdown } from "./FilterDropdown";
import { ExportMenu } from "./ExportMenu";

export function DataTable<TData>({
	columns,
	data,
	enableSorting = false,
	enableFiltering = false,
	enableExport = false,
	exportFilename = "export",
	filterableColumns = [],
	onExport,
}: DataTableProps<TData>) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<
		Record<string, Set<string>>
	>({});

	useEffect(() => {
		const initialFilters: Record<string, Set<string>> = {};
		filterableColumns.forEach((column) => {
			initialFilters[column] = new Set();
		});
		setColumnFilters(initialFilters);
	}, [filterableColumns]);

	const toggleFilter = (columnKey: string, value: string) => {
		setColumnFilters((prev) => {
			const newFilters = { ...prev };
			const columnSet = new Set(prev[columnKey]);

			if (columnSet.has(value)) {
				columnSet.delete(value);
			} else {
				columnSet.add(value);
			}

			newFilters[columnKey] = columnSet;
			return newFilters;
		});
	};

	const clearColumnFilters = (columnKey: string) => {
		setColumnFilters((prev) => ({
			...prev,
			[columnKey]: new Set(),
		}));
	};

	const filteredData = useMemo(() => {
		if (!enableFiltering) return data;

		return data.filter((row) => {
			return Object.entries(columnFilters).every(
				([column, filterValues]) => {
					if (filterValues.size === 0) return true;
					const cellValue = String((row as any)[column]);
					return filterValues.has(cellValue);
				}
			);
		});
	}, [data, columnFilters, enableFiltering]);

	const defaultExport = (format: "csv" | "xlsx") => {
		const exportData = table.getRowModel().rows.map((row) => {
			const rowData: Record<string, any> = {};
			columns.forEach((column: DataTableColumn<TData>) => {
				if (column.accessorKey) {
					rowData[column.accessorKey] = row.getValue(
						column.accessorKey
					);
				}
			});
			return rowData;
		});

		const ws = XLSX.utils.json_to_sheet(exportData);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Data");

		if (format === "csv") {
			XLSX.writeFile(wb, `${exportFilename}.csv`, { bookType: "csv" });
		} else {
			XLSX.writeFile(wb, `${exportFilename}.xlsx`);
		}
	};

	const table = useReactTable({
		data: filteredData,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		enableSorting,
		state: {
			sorting,
		},
	});

	const getUniqueValues = (columnKey: string): string[] => {
		const values = data.map((row) => String((row as any)[columnKey]));
		return Array.from(new Set(values)).sort();
	};

	return (
		<div>
			{enableExport && (
				<div className="mb-4 flex justify-end">
					<ExportMenu onExport={onExport || defaultExport} />
				</div>
			)}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									const columnDef = header.column
										.columnDef as DataTableColumn<TData>;
									const isFilterable =
										columnDef.accessorKey &&
										filterableColumns.includes(
											columnDef.accessorKey
										);

									return (
										<TableHead key={header.id}>
											{isFilterable && enableFiltering ? (
												<FilterDropdown
													tableColumn={header.column}
													columnKey={
														columnDef.accessorKey!
													}
													label={String(
														columnDef.header
													)}
													values={getUniqueValues(
														columnDef.accessorKey!
													)}
													onFilterChange={
														toggleFilter
													}
													onClearFilters={
														clearColumnFilters
													}
													activeFilters={
														columnFilters[
															columnDef.accessorKey!
														]
													}
												/>
											) : header.isPlaceholder ? null : (
												flexRender(
													header.column.columnDef
														.header,
													header.getContext()
												)
											)}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={
										row.getIsSelected() && "selected"
									}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext()
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center">
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
