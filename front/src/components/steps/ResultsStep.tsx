import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/widgets/data-table";
import {
	ColumnDef,
	Column,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	ChevronDown,
	ChevronsUpDown,
	ChevronUp,
	Download,
	Filter,
	X,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Badge } from "../ui/badge";

interface AllocationMetrics {
	number_classes_allocated: number;
	total_classes: number;
	execution_time: number;
	average_grade: number;
}

export interface AllocationResult {
	metrics: AllocationMetrics;
	results: AllocationRow[];
}

interface AllocationRow {
	class: string;
	student: string;
	grade: number | string;
	preference: Record<string, number>;
}

interface ResultsStepProps {
	allocationResult: AllocationResult | null;
	selectedAlgorithm: string;
}

interface FilterDropdownProps {
	tableColumn: Column<AllocationRow, unknown>;
	columnKey: string;
	label: string;
	values: string[];
}

const ResultsStep = ({
	allocationResult,
	selectedAlgorithm,
}: ResultsStepProps) => {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<
		Record<string, Set<string>>
	>({
		class: new Set(),
		student: new Set(),
		grade: new Set(),
	});

	const formatGrade = (value: unknown): string => {
		if (typeof value === "number") {
			return value.toFixed(1);
		}
		if (typeof value === "string") {
			return value === "No preference" ? "-" : value;
		}
		return "-";
	};

	const getUniqueValues = (
		data: AllocationRow[],
		key: keyof AllocationRow
	): string[] => {
		const values = data.map((item) => formatGrade(item[key]));
		return Array.from(new Set(values)).sort((a, b) => {
			if (key === "grade") {
				const numA = parseFloat(a);
				const numB = parseFloat(b);
				if (isNaN(numA)) return 1;
				if (isNaN(numB)) return -1;
				return numA - numB;
			}
			return a.localeCompare(b);
		});
	};

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

	const FilterDropdown = ({
		tableColumn,
		columnKey,
		label,
		values,
	}: FilterDropdownProps) => (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<Button
					variant="ghost"
					onClick={() =>
						tableColumn.toggleSorting(
							tableColumn.getIsSorted() === "asc"
						)
					}
					className="hover:bg-transparent -ml-4">
					{label}
					{tableColumn.getIsSorted() === "asc" ? (
						<ChevronUp className="ml-2 h-4 w-4" />
					) : tableColumn.getIsSorted() === "desc" ? (
						<ChevronDown className="ml-2 h-4 w-4" />
					) : (
						<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
					)}
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							className="h-8 w-8 p-0 hover:bg-transparent">
							<Filter
								className={`h-4 w-4 ${
									columnFilters[columnKey].size > 0
										? "text-primary"
										: "opacity-50"
								}`}
							/>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-48">
						<DropdownMenuItem
							onClick={() => clearColumnFilters(columnKey)}>
							Clear Filters
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						{values.map((value) => (
							<DropdownMenuCheckboxItem
								key={value}
								checked={columnFilters[columnKey].has(value)}
								onCheckedChange={() =>
									toggleFilter(columnKey, value)
								}>
								{value}
							</DropdownMenuCheckboxItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			{columnFilters[columnKey].size > 0 && (
				<div className="flex flex-wrap gap-1 ml-4">
					{Array.from(columnFilters[columnKey]).map((value) => (
						<Badge
							key={value}
							variant="secondary"
							className="text-xs">
							{value}
							<button
								className="ml-1 hover:text-destructive"
								onClick={() => toggleFilter(columnKey, value)}>
								<X className="h-3 w-3" />
							</button>
						</Badge>
					))}
				</div>
			)}
		</div>
	);

	const columns: ColumnDef<AllocationRow>[] = [
		{
			accessorKey: "class",
			header: ({ column }) => (
				<FilterDropdown
					tableColumn={column}
					columnKey="class"
					label="Course"
					values={
						allocationResult
							? getUniqueValues(allocationResult.results, "class")
							: []
					}
				/>
			),
			cell: ({ row }) => (
				<div className="font-medium">
					{String(row.getValue("class"))}
				</div>
			),
		},
		{
			accessorKey: "student",
			header: ({ column }) => (
				<FilterDropdown
					tableColumn={column}
					columnKey="student"
					label="Assigned Tutor"
					values={
						allocationResult
							? getUniqueValues(
									allocationResult.results,
									"student"
							  )
							: []
					}
				/>
			),
			cell: ({ row }) => {
				const student = String(row.getValue("student"));
				return (
					<div
						className={
							student === "No tutor" ? "text-destructive" : ""
						}>
						{student}
					</div>
				);
			},
		},
		{
			accessorKey: "grade",
			header: ({ column }) => (
				<div className="text-center">
					<FilterDropdown
						tableColumn={column}
						columnKey="grade"
						label="Grade"
						values={
							allocationResult
								? getUniqueValues(
										allocationResult.results,
										"grade"
								  )
								: []
						}
					/>
				</div>
			),
			cell: ({ row }) => {
				const value = row.getValue("grade");
				return <div className="text-center">{formatGrade(value)}</div>;
			},
		},
	];

	const filteredData = useMemo(() => {
		if (!allocationResult) return [];

		return allocationResult.results.filter((row) => {
			return Object.entries(columnFilters).every(
				([column, filterValues]) => {
					if (filterValues.size === 0) return true;
					const cellValue = formatGrade(
						row[column as keyof AllocationRow]
					);
					return filterValues.has(cellValue);
				}
			);
		});
	}, [allocationResult, columnFilters]);

	// Create table instance to handle sorting
	const table = useReactTable({
		data: filteredData,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: {
			sorting,
		},
	});

	const exportData = (format: "csv" | "xlsx") => {
		if (!allocationResult) return;

		// Get the sorted and filtered data from the table
		const sortedAndFilteredData = table
			.getRowModel()
			.rows.map((row) => row.original);

		const exportRows = sortedAndFilteredData.map((row) => ({
			Course: row.class,
			"Assigned Tutor": row.student,
			Grade: formatGrade(row.grade),
		}));

		const ws = XLSX.utils.json_to_sheet(exportRows);

		// Adjust column widths
		const colWidths = [
			{ wch: 40 }, // Course
			{ wch: 15 }, // Assigned Tutor
			{ wch: 8 }, // Grade
		];
		ws["!cols"] = colWidths;

		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Allocations");

		// Add metadata about filters and sorting
		const metadataRows = [
			["Export Information"],
			[""],
			["Applied Filters:"],
			...Object.entries(columnFilters)
				.filter(([_, values]) => values.size > 0)
				.map(([column, values]) => [
					`${column}: ${Array.from(values).join(", ")}`,
				]),
			[""],
			["Applied Sorting:"],
			...sorting.map((sort) => [
				`${sort.id}: ${sort.desc ? "descending" : "ascending"}`,
			]),
		];

		if (metadataRows.length > 3) {
			// Only add metadata sheet if there are filters or sorting
			const metadataWs = XLSX.utils.aoa_to_sheet(metadataRows);
			XLSX.utils.book_append_sheet(wb, metadataWs, "Export Info");
		}

		if (format === "csv") {
			XLSX.writeFile(wb, `allocations_${selectedAlgorithm}.csv`, {
				bookType: "csv",
			});
		} else {
			XLSX.writeFile(wb, `allocations_${selectedAlgorithm}.xlsx`);
		}
	};

	if (!allocationResult) {
		return null;
	}

	const { metrics } = allocationResult;

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Summary Metrics</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className="grid grid-cols-3 gap-4">
						<div>
							<dt className="text-sm font-medium text-muted-foreground">
								Algorithm Used
							</dt>
							<dd className="text-2xl font-bold">
								{selectedAlgorithm === "linear"
									? "Linear Programming"
									: "Genetic"}
							</dd>
						</div>
						<div>
							<dt className="text-sm font-medium text-muted-foreground">
								Processing Time
							</dt>
							<dd className="text-2xl font-bold">
								{metrics.execution_time.toFixed(2)} s
							</dd>
						</div>
						<div>
							<dt className="text-sm font-medium text-muted-foreground">
								Classes Allocated
							</dt>
							<dd className="text-2xl font-bold">
								{metrics.number_classes_allocated} / {metrics.total_classes}
							</dd>
						</div>
						<div>
							<dt className="text-sm font-medium text-muted-foreground">
								Percentage Classes Allocated
							</dt>
							<dd className="text-2xl font-bold">
								{((metrics.number_classes_allocated / metrics.total_classes) * 100).toFixed(2)} %
							</dd>
						</div>
						<div>
							<dt className="text-sm font-medium text-muted-foreground">
								Average Grade Allocated
							</dt>
							<dd className="text-2xl font-bold">
								{metrics.average_grade.toFixed(2)}
							</dd>
						</div>
					</dl>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex justify-between items-center">
						<span>Allocation Details</span>
						<div className="flex items-center gap-2">
							<div className="text-sm text-muted-foreground">
								{filteredData.length} of{" "}
								{allocationResult?.results.length} results
							</div>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="ml-auto">
										<Download className="mr-2 h-4 w-4" />
										Export
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onClick={() => exportData("csv")}>
										Export as CSV
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => exportData("xlsx")}>
										Export as Excel
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={columns}
						data={filteredData}
						sorting={sorting}
						setSorting={(updater) => {
							setSorting(
								typeof updater === "function"
									? updater(sorting)
									: updater
							);
						}}
					/>
				</CardContent>
			</Card>
		</div>
	);
};

export default ResultsStep;
