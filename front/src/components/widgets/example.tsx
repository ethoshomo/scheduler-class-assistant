import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "./data-table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../ui/dialog";
import * as XLSX from "xlsx";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Trash2, Plus } from "lucide-react";

interface DataRow {
	[key: string]: string | number | boolean | Date | null;
}

interface FormDataRow {
	[key: string]: string;
}

// Previous helper functions remain the same
const convertToCSV = (data: DataRow[]): string => {
	if (!data.length) return "";

	// Add BOM for UTF-8
	const BOM = "\uFEFF";

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
	return BOM + csvRows.join("\n");
};

const downloadFile = (
	content: string | Blob,
	fileName: string,
	fileType: string
): void => {
	const blob =
		content instanceof Blob
			? content
			: new Blob([content], { type: `${fileType};charset=utf-8` });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};

// Helper function to decode UTF-8 strings correctly
const decodeUTF8 = (text: string): string => {
	try {
		return decodeURIComponent(
			text
				.split("")
				.map(
					(char) =>
						"%" + char.charCodeAt(0).toString(16).padStart(2, "0")
				)
				.join("")
		);
	} catch {
		return text; // Return original text if decoding fails
	}
};

const fileName = "example";

export default function DataTableExample() {
	const [data, setData] = useState<DataRow[]>([]);
	const [columns, setColumns] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isAddRowDialogOpen, setIsAddRowDialogOpen] = useState(false);
	const [newRowData, setNewRowData] = useState<FormDataRow>({});

	// Initialize new row data when columns change
	const resetNewRowData = useCallback(() => {
		const initialData: FormDataRow = {};
		columns.forEach((column) => {
			initialData[column.accessorKey] = "";
		});
		setNewRowData(initialData);
	}, [columns]);

	// Handle input change for new row form
	const handleInputChange = (columnKey: string, value: string) => {
		setNewRowData((prev) => ({
			...prev,
			[columnKey]: value,
		}));
	};

	// Handle form submission for new row
	const handleAddRow = () => {
		setData((prevData) => [...prevData, newRowData]);
		resetNewRowData();
		setIsAddRowDialogOpen(false);
	};

	const handleExportXLSX = useCallback((): void => {
		if (!data.length) {
			alert("No data to export!");
			return;
		}
		const ws = XLSX.utils.json_to_sheet(data);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

		XLSX.writeFile(wb, `${fileName}.xlsx`, {
			bookType: "xlsx",
			bookSST: false,
			type: "file",
		});
	}, [data]);

	const handleExportCSV = useCallback((): void => {
		if (!data.length) {
			alert("No data to export!");
			return;
		}
		const csv = convertToCSV(data);
		downloadFile(csv, `${fileName}.csv`, "text/csv");
	}, [data]);

	const handleClearData = useCallback((): void => {
		if (window.confirm("Are you sure you want to clear all data?")) {
			setData([]);
			setColumns([]);
		}
	}, []);

	const columnHelper = createColumnHelper<DataRow>();

	const onDrop = useCallback((acceptedFiles: File[]) => {
		const file = acceptedFiles[0];
		if (!file) return;

		setIsLoading(true);
		const reader = new FileReader();

		reader.onload = (event) => {
			try {
				const arrayBuffer = event.target?.result as ArrayBuffer;
				const workbook = XLSX.read(arrayBuffer, {
					type: "array",
					codepage: 65001, // UTF-8 encoding
				});
				const wsname = workbook.SheetNames[0];
				const ws = workbook.Sheets[wsname];
				const rawData = XLSX.utils.sheet_to_json(ws, {
					raw: false,
					defval: "",
				}) as DataRow[];

				// Process the data to fix encoding issues
				const processedData = rawData.map((row) => {
					const newRow: DataRow = {};
					Object.entries(row).forEach(([key, value]) => {
						// Decode both keys and values if they're strings
						const decodedKey =
							typeof key === "string" ? decodeUTF8(key) : key;
						const decodedValue =
							typeof value === "string"
								? decodeUTF8(value)
								: value;
						newRow[decodedKey] = decodedValue;
					});
					return newRow;
				});

				// Generate columns from the first row of data
				if (processedData.length > 0) {
					const cols = Object.keys(processedData[0]).map((key) => {
						return columnHelper.accessor(key, {
							header: key,
							cell: (info) => info.getValue(),
						});
					});
					setColumns(cols);
					setData(processedData);
				}
			} catch (error) {
				console.error("Error processing file:", error);
				alert(
					"Error processing file. Please make sure it is a valid Excel or CSV file."
				);
			} finally {
				setIsLoading(false);
			}
		};

		reader.onerror = (error) => {
			console.error("File reading error:", error);
			alert("Error reading file. Please try again.");
			setIsLoading(false);
		};

		reader.readAsArrayBuffer(file);
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
				[".xlsx"],
			"text/csv": [".csv"],
		},
		multiple: false,
	});

	return (
		<div className="container mx-auto py-10">
			<div
				{...getRootProps()}
				className={`
          relative p-8 mb-4 border-2 border-dashed rounded-lg 
          transition-colors duration-200 ease-in-out
          flex flex-col items-center justify-center
          min-h-[200px]
          ${
				isDragActive
					? "border-blue-500 bg-blue-50"
					: "border-gray-300 hover:border-gray-400"
			}
          ${isLoading ? "opacity-50 cursor-wait" : "cursor-pointer"}
        `}>
				<input {...getInputProps()} />
				<Upload className="w-10 h-10 mb-4 text-gray-400" />
				{isLoading ? (
					<p className="text-sm text-gray-500">Processing file...</p>
				) : isDragActive ? (
					<p className="text-sm text-blue-500 font-medium">
						Drop the file here...
					</p>
				) : (
					<div className="text-center">
						<p className="text-sm text-gray-500 mb-1">
							Drag and drop your Excel or CSV file here
						</p>
						<p className="text-xs text-gray-400">
							or click to select a file
						</p>
					</div>
				)}
				<div className="mt-2 text-xs text-gray-400">
					Supported formats: .xlsx, .csv
				</div>
			</div>

			<div className="flex gap-4 mb-4">
				{columns.length > 0 && (
					<Dialog
						open={isAddRowDialogOpen}
						onOpenChange={setIsAddRowDialogOpen}>
						<DialogTrigger asChild>
							<Button
								onClick={() => resetNewRowData()}
								className="w-40">
								<Plus className="w-4 h-4 mr-2" />
								Add Row
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Add New Row</DialogTitle>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								{columns.map((column) => (
									<div
										key={column.accessorKey}
										className="grid grid-cols-4 items-center gap-4">
										<label
											htmlFor={column.accessorKey}
											className="text-right">
											{column.header}
										</label>
										<Input
											id={column.accessorKey}
											value={
												newRowData[
													column.accessorKey
												] || ""
											}
											onChange={(e) =>
												handleInputChange(
													column.accessorKey,
													e.target.value
												)
											}
											className="col-span-3"
										/>
									</div>
								))}
							</div>
							<Button onClick={handleAddRow}>Add Row</Button>
						</DialogContent>
					</Dialog>
				)}
				<Button
					onClick={handleExportXLSX}
					disabled={!data.length || isLoading}
					className="w-40">
					Export XLSX
				</Button>
				<Button
					onClick={handleExportCSV}
					disabled={!data.length || isLoading}
					className="w-40">
					Export CSV
				</Button>
				<Button
					onClick={handleClearData}
					disabled={!data.length || isLoading}
					variant="destructive"
					className="w-40">
					<Trash2 className="w-4 h-4 mr-2" />
					Clear Data
				</Button>
			</div>

			{data.length > 0 && <DataTable columns={columns} data={data} />}
		</div>
	);
}
