import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "./widgets/data-table";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface StudentData {
	id: string;
	studentId: string;
	course: string;
	classNumber: number;
	grade: number;
	preference: number;
}

interface StudentInputProps {
	courses: { course: string; classes: number }[];
	data: StudentData[];
	onDataChange: (data: StudentData[]) => void;
}

const templateData = [
	{
		"Student ID": "10101010",
		"Course Name": "SMA0300 - Geometria Analítica",
		"Class Number": 1,
		Grade: 7.5,
		Preference: 2,
	},
	{
		"Student ID": "10101010",
		"Course Name": "SMA0353 - Cálculo I",
		"Class Number": 2,
		Grade: 8,
		Preference: 1,
	},
];

const REQUIRED_COLUMNS = [
	"Student ID",
	"Course Name",
	"Class Number",
	"Grade",
	"Preference",
];

const StudentInput = ({ courses, data, onDataChange }: StudentInputProps) => {
	const [newStudentId, setNewStudentId] = useState("");
	const [newCourse, setNewCourse] = useState("");
	const [newClassNumber, setNewClassNumber] = useState("");
	const [newGrade, setNewGrade] = useState("");
	const [newPreference, setNewPreference] = useState("");
	const { toast } = useToast();

	const validateFileData = (
		headers: string[],
		rows: any[]
	): { isValid: boolean; errors: string[] } => {
		const errors: string[] = [];

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

			// Check Student ID
			if (!row["Student ID"] || !/^\d+$/.test(row["Student ID"])) {
				errors.push(
					`Row ${rowNumber}: Invalid Student ID (must be numeric)`
				);
			}

			// Check Course Name
			const courseName = row["Course Name"];
			if (!courseName || !courses.some((c) => c.course === courseName)) {
				errors.push(`Row ${rowNumber}: Invalid or unknown Course Name`);
			}

			// Check Class Number
			const classNumber = Number(row["Class Number"]);
			const course = courses.find((c) => c.course === courseName);
			if (
				!course ||
				isNaN(classNumber) ||
				classNumber < 1 ||
				classNumber > course.classes
			) {
				errors.push(
					`Row ${rowNumber}: Invalid Class Number for the course`
				);
			}

			// Check Grade
			const grade = Number(row["Grade"]);
			if (isNaN(grade) || grade < 0 || grade > 10) {
				errors.push(`Row ${rowNumber}: Grade must be between 0 and 10`);
			}

			// Check Preference
			const preference = Number(row["Preference"]);
			if (!Number.isInteger(preference) || preference < 1) {
				errors.push(
					`Row ${rowNumber}: Preference must be a positive integer`
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
		onDataChange(data.filter((row) => row.id !== id));
	};

	const columns: ColumnDef<StudentData>[] = [
		{
			accessorKey: "studentId",
			header: "Student ID",
		},
		{
			accessorKey: "course",
			header: "Course Name",
		},
		{
			accessorKey: "classNumber",
			header: "Class Number",
		},
		{
			accessorKey: "grade",
			header: "Grade",
		},
		{
			accessorKey: "preference",
			header: "Preference",
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

	const validateNewRow = (): string | null => {
		if (!/^\d+$/.test(newStudentId)) {
			return "Student ID must be numeric";
		}

		const course = courses.find((c) => c.course === newCourse);
		const classNum = Number(newClassNumber);
		if (
			!course ||
			isNaN(classNum) ||
			classNum < 1 ||
			classNum > course.classes
		) {
			return "Invalid class number for the selected course";
		}

		const grade = Number(newGrade);
		if (isNaN(grade) || grade < 0 || grade > 10) {
			return "Grade must be between 0 and 10";
		}

		const preference = Number(newPreference);
		if (!Number.isInteger(preference) || preference < 1) {
			return "Preference must be a positive integer";
		}

		return null;
	};

	const handleAddRow = () => {
		const error = validateNewRow();
		if (error) {
			toast({
				variant: "destructive",
				title: "Invalid Input",
				description: error,
			});
			return;
		}

		onDataChange([
			...data,
			{
				id: crypto.randomUUID(),
				studentId: newStudentId,
				course: newCourse,
				classNumber: Number(newClassNumber),
				grade: Number(newGrade),
				preference: Number(newPreference),
			},
		]);

		// Reset form
		setNewStudentId("");
		setNewCourse("");
		setNewClassNumber("");
		setNewGrade("");
		setNewPreference("");
	};

	const downloadTemplate = (format: "csv" | "xlsx") => {
		const wb = XLSX.utils.book_new();
		const ws = XLSX.utils.json_to_sheet(templateData);
		XLSX.utils.book_append_sheet(wb, ws, "Template");

		if (format === "csv") {
			XLSX.writeFile(wb, "students_data_template.csv", {
				bookType: "csv",
			});
		} else {
			XLSX.writeFile(wb, "students_data_template.xlsx");
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

					const validation = validateFileData(headers, parsedRows);

					if (!validation.isValid) {
						handleFileValidationError(validation.errors);
						return;
					}

					const validData = parsedRows.map((row) => ({
						id: crypto.randomUUID(),
						studentId: row["Student ID"],
						course: row["Course Name"],
						classNumber: Number(row["Class Number"]),
						grade: Number(row["Grade"]),
						preference: Number(row["Preference"]),
					}));

					onDataChange(validData);
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

					const headers = Object.keys(parsedRows[0] || {});
					const validation = validateFileData(headers, parsedRows);

					if (!validation.isValid) {
						handleFileValidationError(validation.errors);
						return;
					}

					const validData = parsedRows.map((row) => ({
						id: crypto.randomUUID(),
						studentId: String((row as any)["Student ID"]),
						course: (row as any)["Course Name"],
						classNumber: Number((row as any)["Class Number"]),
						grade: Number((row as any)["Grade"]),
						preference: Number((row as any)["Preference"]),
					}));

					onDataChange(validData);
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
				<h3 className="text-lg font-medium">Student Details</h3>
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
					placeholder="Student ID"
					value={newStudentId}
					onChange={(e) => setNewStudentId(e.target.value)}
					className="w-40"
				/>
				<Select value={newCourse} onValueChange={setNewCourse}>
					<SelectTrigger className="flex-1">
						<SelectValue placeholder="Select Course" />
					</SelectTrigger>
					<SelectContent>
						{courses.map((course) => (
							<SelectItem
								key={course.course}
								value={course.course}>
								{course.course}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Input
					placeholder="Class Number"
					type="number"
					min="1"
					value={newClassNumber}
					onChange={(e) => setNewClassNumber(e.target.value)}
					className="w-32"
				/>
				<Input
					placeholder="Grade"
					type="number"
					step="0.1"
					min="0"
					max="10"
					value={newGrade}
					onChange={(e) => setNewGrade(e.target.value)}
					className="w-32"
				/>
				<Input
					placeholder="Preference"
					type="number"
					min="1"
					value={newPreference}
					onChange={(e) => setNewPreference(e.target.value)}
					className="w-32"
				/>
				<Button
					onClick={handleAddRow}
					disabled={
						!newStudentId ||
						!newCourse ||
						!newClassNumber ||
						!newGrade ||
						!newPreference
					}>
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

export default StudentInput;
