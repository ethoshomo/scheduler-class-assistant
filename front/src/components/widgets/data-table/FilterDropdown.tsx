import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuCheckboxItem,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
	Filter,
	ChevronUp,
	ChevronDown,
	ChevronsUpDown,
	X,
} from "lucide-react";
import { FilterDropdownProps } from "./types";

export function FilterDropdown<TData>({
	tableColumn,
	columnKey,
	label,
	values,
	onFilterChange,
	onClearFilters,
	activeFilters = new Set(),
}: FilterDropdownProps<TData>) {
	// Early return if required props are missing
	if (!columnKey || !label || !values) {
		return null;
	}

	return (
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
									activeFilters.size > 0
										? "text-primary"
										: "opacity-50"
								}`}
							/>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						className="w-48"
						style={{ maxHeight: "300px", overflowY: "auto" }}>
						<div className="py-2">
							<DropdownMenuItem
								onClick={() => onClearFilters(columnKey)}>
								Clear Filters
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							{values.map((value) => (
								<DropdownMenuCheckboxItem
									key={value}
									checked={activeFilters.has(value)}
									onCheckedChange={() =>
										onFilterChange(columnKey, value)
									}>
									{value}
								</DropdownMenuCheckboxItem>
							))}
						</div>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			{activeFilters.size > 0 && (
				<div className="flex flex-wrap gap-1 ml-4">
					{Array.from(activeFilters).map((value) => (
						<Badge
							key={value}
							variant="secondary"
							className="text-xs">
							{value}
							<button
								className="ml-1 hover:text-destructive"
								onClick={() =>
									onFilterChange(columnKey, value)
								}>
								<X className="h-3 w-3" />
							</button>
						</Badge>
					))}
				</div>
			)}
		</div>
	);
}
