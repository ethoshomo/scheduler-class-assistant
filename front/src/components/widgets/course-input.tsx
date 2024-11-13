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

interface CourseData {
	id: string;
	course: string;
	classes: number;
}

// Template data with correct column names matching the template file
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

		const reader = new FileReader();
		reader.onload = (event: ProgressEvent<FileReader>) => {
			try {
				if (file.name.endsWith(".csv")) {
					const text = event.target?.result as string;
					const rows = text.split("\n").slice(1); // Skip header
					const parsedData = rows
						.filter((row) => row.trim())
						.map((row) => {
							const [course, classes] = row.split(",");
							return {
								id: crypto.randomUUID(),
								course: course.trim(),
								classes: parseInt(classes.trim()),
							};
						});
					setData(parsedData);
				} else {
					const arrayBuffer = event.target?.result as ArrayBuffer;
					const workbook = XLSX.read(arrayBuffer, { type: "array" });
					const sheetName = workbook.SheetNames[0];
					const sheet = workbook.Sheets[sheetName];
					const parsedData = XLSX.utils.sheet_to_json(sheet);
					setData(
						parsedData.map((row) => ({
							id: crypto.randomUUID(),
							course: (row as any)["Course Name"],
							classes: Number((row as any)["Number of Classes"]),
						}))
					);
				}
			} catch (error) {
				console.error("Error processing file:", error);
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
