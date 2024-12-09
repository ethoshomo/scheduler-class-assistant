import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";

interface ExportMenuProps {
	onExport: (format: "csv" | "xlsx") => void;
}

export function ExportMenu({ onExport }: ExportMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="ml-auto">
					<Download className="mr-2 h-4 w-4" />
					Export
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => onExport("csv")}>
					Export as CSV
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => onExport("xlsx")}>
					Export as Excel
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
