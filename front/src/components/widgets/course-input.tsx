import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "./data-table";
import { Download, Plus, Upload, Trash2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { ColumnDef } from "@tanstack/react-table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface CourseData {
	id: string;
	course: string;
	classes: number;
}

const REQUIRED_COLUMNS = ["Course Name", "Number of Classes"];

const templateData = [
	{
		"Course Name": "SMA0300 - Geometria Analítica",
		"Number of Classes": 1,
	},
	{
		"Course Name": "SMA0353 - Cálculo I",
		"Number of Classes": 2,
	},
];

const CourseInput = () => {
	const [data, setData] = useState<CourseData[]>([]);
	const [newCourse, setNewCourse] = useState("");
	const [newClasses, setNewClasses] = useState("");
	const { toast } = useToast();

	const validateFileData = (
		headers: string[],
		rows: any[]
	): { isValid: boolean; errors: string[] } => {
		const errors: string[] = [];
		const courseNames = new Set<string>();

		// Check if all required columns are present
		const missingColumns = REQUIRED_COLUMNS.filter(
			(col) => !headers.includes(col)
		);
		if (missingColumns.length > 0) {
			errors.push(
				`Missing required columns: ${missingColumns.join(", ")}`
			);
		}

		// Validate each row
		rows.forEach((row, index) => {
			const rowNumber = index + 1;
			const courseName = row["Course Name"];

			// Check Course Name
			if (!courseName || typeof courseName !== "string") {
				errors.push(`Row ${rowNumber}: Invalid or missing Course Name`);
			} else {
				// Check for duplicate course names
				if (courseNames.has(courseName)) {
					errors.push(
						`Row ${rowNumber}: Duplicate course name "${courseName}"`
					);
				} else {
					courseNames.add(courseName);
				}
			}

			// Check Number of Classes
			const classCount = Number(row["Number of Classes"]);
			if (
				isNaN(classCount) ||
				classCount <= 0 ||
				!Number.isInteger(classCount)
			) {
				errors.push(
					`Row ${rowNumber}: Number of Classes must be a positive integer`
				);
			}
		});

		return {
			isValid: errors.length === 0,
			errors,
		};
	};

	const handleFileValidationError = (errors: string[]) => {
		toast({
			variant: "destructive",
			title: "Error in uploaded file",
			description: (
				<div className="mt-2 max-h-[200px] overflow-y-auto">
					<ul className="list-disc pl-4 space-y-1">
						{errors.map((error, index) => (
							<li key={index} className="text-sm">
								{error}
							</li>
						))}
					</ul>
				</div>
			),
		});
	};

	const handleDeleteRow = (id: string) => {
		setData(data.filter((row) => row.id !== id));
	};

	const columns: ColumnDef<CourseData>[] = [
		{
			accessorKey: "course",
			header: "Course Name",
		},
		{
			accessorKey: "classes",
			header: "Number of Classes",
		},
		{
			id: "actions",
			cell: ({ row }) => {
				return (
					<Button
						variant="ghost"
						size="icon"
						onClick={() => handleDeleteRow(row.original.id)}
						className="h-8 w-8 p-0">
						<Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
					</Button>
				);
			},
		},
	];

	const handleAddRow = () => {
		if (newCourse && newClasses) {
			// Check if course name already exists
			if (
				data.some(
					(item) =>
						item.course.toLowerCase() === newCourse.toLowerCase()
				)
			) {
				toast({
					variant: "destructive",
					title: "Duplicate Course Name",
					description: `A course with the name "${newCourse}" already exists.`,
				});
				return;
			}

			setData([
				...data,
				{
					id: crypto.randomUUID(),
					course: newCourse,
					classes: parseInt(newClasses),
				},
			]);
			setNewCourse("");
			setNewClasses("");
		}
	};

	const downloadTemplate = (format: "csv" | "xlsx") => {
		const wb = XLSX.utils.book_new();
		const ws = XLSX.utils.json_to_sheet(templateData);
		XLSX.utils.book_append_sheet(wb, ws, "Template");

		if (format === "csv") {
			XLSX.writeFile(wb, "classes_data_template.csv", {
				bookType: "csv",
			});
		} else {
			XLSX.writeFile(wb, "classes_data_template.xlsx");
		}
	};

	const onDrop = async (acceptedFiles: File[]) => {
		const file = acceptedFiles[0];
		if (!file) return;

		toast({
			title: "Processing file",
			description:
				"Please wait while we validate and process your file...",
		});

		const reader = new FileReader();
		reader.onload = (event: ProgressEvent<FileReader>) => {
			try {
				if (file.name.endsWith(".csv")) {
					const text = event.target?.result as string;
					const rows = text.split("\n");
					const headers = rows[0]
						.split(",")
						.map((header) => header.trim());

					// Parse rows into objects
					const parsedRows = rows
						.slice(1)
						.filter((row) => row.trim())
						.map((row) => {
							const values = row
								.split(",")
								.map((value) => value.trim());
							return headers.reduce((obj, header, index) => {
								obj[header] = values[index];
								return obj;
							}, {} as Record<string, string>);
						});

					// Validate the data
					const validation = validateFileData(headers, parsedRows);

					if (!validation.isValid) {
						handleFileValidationError(validation.errors);
						return;
					}

					const validData = parsedRows.map((row) => ({
						id: crypto.randomUUID(),
						course: row["Course Name"],
						classes: parseInt(row["Number of Classes"]),
					}));

					setData(validData);
					toast({
						title: "Success",
						description: "File processed successfully",
					});
				} else {
					const arrayBuffer = event.target?.result as ArrayBuffer;
					const workbook = XLSX.read(arrayBuffer, { type: "array" });
					const sheetName = workbook.SheetNames[0];
					const sheet = workbook.Sheets[sheetName];
					const parsedRows = XLSX.utils.sheet_to_json(sheet);

					// Get headers from the first row
					const headers = Object.keys(parsedRows[0] || {});

					// Validate the data
					const validation = validateFileData(headers, parsedRows);

					if (!validation.isValid) {
						handleFileValidationError(validation.errors);
						return;
					}

					const validData = parsedRows.map((row) => ({
						id: crypto.randomUUID(),
						course: (row as any)["Course Name"],
						classes: Number((row as any)["Number of Classes"]),
					}));

					setData(validData);
					toast({
						title: "Success",
						description: "File processed successfully",
					});
				}
			} catch (error) {
				console.error("Error processing file:", error);
				toast({
					variant: "destructive",
					title: "Error",
					description:
						"Failed to process file. Please ensure it matches the template format.",
				});
			}
		};

		if (file.name.endsWith(".csv")) {
			reader.readAsText(file);
		} else {
			reader.readAsArrayBuffer(file);
		}
	};

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"text/csv": [".csv"],
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
				[".xlsx"],
		},
		multiple: false,
	});

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-medium">Course Details</h3>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm">
							<Download className="w-4 h-4 mr-2" />
							Download Template
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem
							onClick={() => downloadTemplate("csv")}>
							CSV Format
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => downloadTemplate("xlsx")}>
							Excel Format
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div
				{...getRootProps()}
				className={`
          p-6 border-2 border-dashed rounded-lg 
          transition-colors duration-200 ease-in-out
          flex flex-col items-center justify-center
          ${isDragActive ? "border-primary bg-primary/5" : "border-border"}
        `}>
				<input {...getInputProps()} />
				<Upload className="w-8 h-8 mb-4 text-muted-foreground" />
				<p className="text-sm text-muted-foreground text-center">
					Drop your CSV or XLSX file here, or click to select
				</p>
				<p className="text-xs text-muted-foreground mt-2">
					Use the template button above for the correct format
				</p>
			</div>

			<div className="flex items-center space-x-4">
				<Input
					placeholder="Course Name"
					value={newCourse}
					onChange={(e) => setNewCourse(e.target.value)}
					className="flex-1"
				/>
				<Input
					placeholder="Number of Classes"
					type="number"
					value={newClasses}
					onChange={(e) => setNewClasses(e.target.value)}
					className="w-40"
				/>
				<Button
					onClick={handleAddRow}
					disabled={!newCourse || !newClasses}>
					<Plus className="w-4 h-4 mr-2" />
					Add
				</Button>
			</div>

			<div className="border rounded-md">
				<DataTable columns={columns} data={data} />
			</div>
		</div>
	);
};

export default CourseInput;
