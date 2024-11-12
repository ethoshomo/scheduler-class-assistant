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
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Trash2, Plus } from "lucide-react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { downloadDir, documentDir } from "@tauri-apps/api/path";

interface DataRow {
	[key: string]: string | number | boolean | Date | null;
}

interface FormDataRow {
	[key: string]: string;
}

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

export default function DataTableExample() {
	const [data, setData] = useState<DataRow[]>([]);
	const [columns, setColumns] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isAddRowDialogOpen, setIsAddRowDialogOpen] = useState(false);
	const [newRowData, setNewRowData] = useState<FormDataRow>({});

	const columnHelper = createColumnHelper<DataRow>();

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

	const handleExportCSV = async () => {
		if (!data.length) {
			alert("No data to export!");
			return;
		}
		try {
			// Get the downloads directory path
			const downloadsPath = await downloadDir();

			const filePath = await save({
				filters: [
					{
						name: "CSV",
						extensions: ["csv"],
					},
				],
				defaultPath: downloadsPath,
			});

			if (filePath) {
				const csvContent = convertToCSV(data);
				await writeTextFile(filePath, csvContent);
			}
		} catch (error) {
			console.error("Failed to export CSV:", error);
			alert("Failed to export CSV file");
		}
	};

	const handleClearData = useCallback((): void => {
		if (window.confirm("Are you sure you want to clear all data?")) {
			setData([]);
			setColumns([]);
		}
	}, []);

	const processFileContent = (content: string) => {
		try {
			const lines = content.trim().split("\n");
			const headers = lines[0].split(",").map((h) => h.trim());
			const processedData = lines.slice(1).map((line) => {
				const values = line.split(",");
				const row: DataRow = {};
				headers.forEach((header, index) => {
					// Decode both keys and values if they're strings
					const decodedHeader =
						typeof header === "string"
							? decodeUTF8(header)
							: header;
					const value = values[index] ? values[index].trim() : "";
					const decodedValue =
						typeof value === "string" ? decodeUTF8(value) : value;
					row[decodedHeader] = decodedValue;
				});
				return row;
			});

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
				"Error processing file. Please make sure it is a valid CSV file."
			);
		}
	};

	const onDrop = useCallback(async (acceptedFiles: File[]) => {
		const file = acceptedFiles[0];
		if (!file) return;

		setIsLoading(true);
		try {
			// Get the documents directory path for the default location
			const docsPath = await documentDir();

			const selected = await open({
				multiple: false,
				directory: false,
				defaultPath: docsPath,
				filters: [
					{
						name: "CSV",
						extensions: ["csv"],
					},
				],
			});

			if (selected && !Array.isArray(selected)) {
				// Note: readTextFile now just takes the path
				const fileContent = await readTextFile(selected);
				processFileContent(fileContent);
			}
		} catch (error) {
			console.error("Error reading file:", error);
			alert("Error reading file. Please try again.");
		} finally {
			setIsLoading(false);
		}
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
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
							Drag and drop your CSV file here
						</p>
						<p className="text-xs text-gray-400">
							or click to select a file
						</p>
					</div>
				)}
				<div className="mt-2 text-xs text-gray-400">
					Supported format: .csv
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
