import { useState, useCallback } from "react";
import { createColumnHelper, ColumnDef } from "@tanstack/react-table";
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
import { useDropzone } from "react-dropzone";
import { Upload, Trash2, Plus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { writeFile, BaseDirectory, mkdir } from "@tauri-apps/plugin-fs";
import { appConfigDir, join } from "@tauri-apps/api/path";

interface PreferenceRecord {
	[key: string]: number;
}

interface SchedulerRow {
	class: string;
	student: string;
	grade: string | number;
	preference: PreferenceRecord;
}

interface DataRow {
	class: string;
	student: string;
	grade: string | number;
	preference?: PreferenceRecord;
}

interface FormDataRow {
	[key: string]: string;
}

interface Metrics {
	best_creature: number[];
	number_classes: number;
	satisfaction: number;
}

export default function DataTableExample() {
	const [data, setData] = useState<DataRow[]>([]);
	const [columns, setColumns] = useState<ColumnDef<DataRow, any>[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [metrics, setMetrics] = useState<Metrics | null>(null);
	const [isAddRowDialogOpen, setIsAddRowDialogOpen] = useState(false);
	const [newRowData, setNewRowData] = useState<FormDataRow>({});

	// Initialize new row data when columns change
	const resetNewRowData = useCallback(() => {
		const initialData: FormDataRow = {};
		columns.forEach((column: any) => {
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
		setData((prevData) => [...prevData, newRowData as unknown as DataRow]);
		resetNewRowData();
		setIsAddRowDialogOpen(false);
	};

	const handleClearData = useCallback(async (): Promise<void> => {
		const userConfirmed = window.confirm(
			"Are you sure you want to clear all data?"
		);
		if (userConfirmed) {
			setData([]);
			setColumns([]);
			setMetrics(null);
		}
	}, []);

	const onDrop = useCallback(async (acceptedFiles: File[]) => {
		const file = acceptedFiles[0];
		if (!file) return;

		setIsLoading(true);

		try {
			// Check file extension
			const fileExtension = file.name.split(".").pop()?.toLowerCase();
			if (fileExtension !== "xlsx") {
				throw new Error("File must be an XLSX file");
			}

			// Ensure directory exists
			await mkdir("", {
				baseDir: BaseDirectory.AppConfig,
				recursive: true,
			});

			// Convert File to Uint8Array
			const fileContent = new Uint8Array(await file.arrayBuffer());

			// Write file using Tauri v2 API
			await writeFile(file.name, fileContent, {
				baseDir: BaseDirectory.AppConfig,
			});

			// Get the absolute file path using Tauri path APIs
			const configDir = await appConfigDir();
			const filePath = await join(configDir, file.name);

			// Process with Python scheduler
			const result = (await invoke("process_excel_file", {
				filePath: filePath,
			})) as {
				success: boolean;
				data: {
					metrics: Metrics;
					results: SchedulerRow[];
				};
			};

			console.log(result)

			if (result.success && result.data) {
				const { metrics, results } = result.data;

				if (results.length > 0) {
					const columnHelper = createColumnHelper<DataRow>();
					const cols = [
						columnHelper.accessor("class", {
							header: "Disciplina",
							cell: (info) => info.getValue(),
						}),
						columnHelper.accessor("student", {
							header: "Monitor",
							cell: (info) => info.getValue(),
						}),
						columnHelper.accessor("grade", {
							header: "Nota",
							cell: (info) => info.getValue(),
						}),
					];

					// Transform the data to match DataRow interface
					const displayData: DataRow[] = results.map((row) => ({
						class: row.class,
						student: row.student,
						grade: row.grade,
						preference: row.preference,
					}));

					setColumns(cols);
					setData(displayData);
					setMetrics(metrics);
				} else {
					throw new Error("No results generated from scheduler");
				}
			} else {
				throw new Error("Failed to process scheduling");
			}
		} catch (error) {
			console.error("Error processing file:", error);
			alert(
				error instanceof Error
					? error.message
					: "Failed to process scheduling"
			);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
				[".xlsx"],
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
							Drag and drop your Excel file here
						</p>
						<p className="text-xs text-gray-400">
							or click to select a file
						</p>
					</div>
				)}
				<div className="mt-2 text-xs text-gray-400">
					Supported format: .xlsx
				</div>
			</div>

			{metrics && (
				<div className="mb-4 p-4 bg-gray-50 rounded-lg">
					<h3 className="text-lg font-medium mb-2">Metrics</h3>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<p className="text-sm text-gray-600">
								Total Classes
							</p>
							<p className="text-lg font-medium">
								{metrics.number_classes}
							</p>
						</div>
						<div>
							<p className="text-sm text-gray-600">
								Satisfaction Score
							</p>
							<p className="text-lg font-medium">
								{metrics.satisfaction.toFixed(2)}
							</p>
						</div>
					</div>
				</div>
			)}

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
								{columns.map((column: any) => (
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
