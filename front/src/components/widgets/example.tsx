import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./data-table";
import { Button } from "../ui/button";
import * as XLSX from "xlsx";

// Define interfaces for our data structures
interface DataRow {
	[key: string]: string | number | boolean | Date | null;
}

// Utility function to convert data to CSV
const convertToCSV = (data: DataRow[]): string => {
	const headers = Object.keys(data[0]);
	const csvRows = [
		headers.join(","), // Header row
		...data.map((row) =>
			headers
				.map((header) => {
					let cell = row[header];

					// Convert different types to string representation
					if (cell instanceof Date) {
						cell = cell.toISOString();
					} else if (cell === null) {
						cell = "";
					} else {
						cell = String(cell);
					}

					// Handle cells that contain commas or quotes
					if (cell.includes(",") || cell.includes('"')) {
						cell = `"${cell.replace(/"/g, '""')}"`;
					}
					return cell;
				})
				.join(",")
		),
	];
	return csvRows.join("\n");
};

// Utility function to download file
const downloadFile = (
	content: string | Blob,
	fileName: string,
	fileType: string
): void => {
	const blob =
		content instanceof Blob
			? content
			: new Blob([content], { type: fileType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};

type Payment = {
	id: string;
	amount: number;
	status: "pending" | "processing" | "success" | "failed";
	email: string;
};

export const payments: Payment[] = [
	{
		id: "728ed52f",
		amount: 100,
		status: "pending",
		email: "m@example.com",
	},
	{
		id: "489e1d42",
		amount: 125,
		status: "processing",
		email: "example@gmail.com",
	},
];

export const columns: ColumnDef<Payment>[] = [
	{
		accessorKey: "status",
		header: "Status",
	},
	{
		accessorKey: "email",
		header: "Email",
	},
	{
		accessorKey: "amount",
		header: "Amount",
	},
];

const data = payments;
const fileName = "example";

export default function DataTableExample() {
	const handleExportXLSX = (): void => {
		// Create worksheet from data
		const ws = XLSX.utils.json_to_sheet(data);

		// Create workbook and add worksheet
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

		// Generate XLSX file and trigger download
		XLSX.writeFile(wb, `${fileName}.xlsx`);
	};

	const handleExportCSV = (): void => {
		const csv = convertToCSV(data);
		downloadFile(csv, `${fileName}.csv`, "text/csv");
	};

	return (
		<div className="container mx-auto py-10">
			<Button onClick={handleExportXLSX}>Download xlsx</Button>
			<Button onClick={handleExportCSV}>Download csv</Button>
			<DataTable columns={columns} data={data} />
		</div>
	);
}
