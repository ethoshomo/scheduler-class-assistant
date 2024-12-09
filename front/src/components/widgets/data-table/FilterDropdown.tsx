import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
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
	const [searchTerm, setSearchTerm] = useState("");
	const [filteredValues, setFilteredValues] = useState<string[]>(values);
	const [isOpen, setIsOpen] = useState(false);

	// Filter values based on search term
	useEffect(() => {
		const filtered = values.filter((value) =>
			String(value).toLowerCase().includes(searchTerm.toLowerCase())
		);
		setFilteredValues(filtered);
	}, [searchTerm, values]);

	// Early return if required props are missing
	if (!columnKey || !label || !values) {
		return null;
	}

	const handleClearFilters = () => {
		onClearFilters(columnKey);
		setIsOpen(false); // Close after clearing all filters
	};

	const handleFilterChange = (value: string) => {
		onFilterChange(columnKey, value);
		// Don't close the dropdown - let it stay open
	};

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
				<DropdownMenu
					open={isOpen}
					onOpenChange={setIsOpen}
					modal={false}>
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
						className="w-60"
						style={{ maxHeight: "400px" }}>
						<div className="p-2">
							<Input
								placeholder="Search..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="h-8"
							/>
						</div>
						<DropdownMenuSeparator />
						<div className="py-2 max-h-60 overflow-y-auto">
							<DropdownMenuItem onClick={handleClearFilters}>
								Clear Filters
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							{filteredValues.length === 0 ? (
								<div className="px-2 py-1 text-sm text-muted-foreground">
									No results found
								</div>
							) : (
								filteredValues.map((value) => (
									<DropdownMenuCheckboxItem
										key={value}
										checked={activeFilters.has(value)}
										onSelect={(e) => e.preventDefault()}
										onCheckedChange={() =>
											handleFilterChange(value)
										}>
										{String(value)}
									</DropdownMenuCheckboxItem>
								))
							)}
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
								onClick={() => handleFilterChange(value)}>
								<X className="h-3 w-3" />
							</button>
						</Badge>
					))}
				</div>
			)}
		</div>
	);
}
