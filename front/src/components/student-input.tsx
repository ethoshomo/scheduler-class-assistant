import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/widgets/data-table";
import { Download, Plus, Upload, Trash2, Pencil, XCircle } from "lucide-react";
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
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export interface StudentData {
	id: string;
	studentId: string;
	course: string;
	grade: number;
	preference: number;
}

interface StudentInputProps {
	courses: { course: string; classes: number }[];
	data: StudentData[];
	onDataChange: (data: StudentData[]) => void;
}

const REQUIRED_COLUMNS = ["Student ID", "Course Name", "Grade", "Preference"];

const templateData = [
	{
		"Student ID": "10101010",
		"Course Name": "SMA0300 - Geometria Analítica",
		Grade: 7.5,
		Preference: 2,
	},
	{
		"Student ID": "10101010",
		"Course Name": "SMA0353 - Cálculo I",
		Grade: 8,
		Preference: 1,
	},
];

const StudentInput = ({ courses, data, onDataChange }: StudentInputProps) => {
	const [newStudentId, setNewStudentId] = useState("");
	const [newCourse, setNewCourse] = useState("");
	const [newGrade, setNewGrade] = useState("");
	const [newPreference, setNewPreference] = useState("");
	const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
	const { toast } = useToast();

	// Edit dialog state
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editingStudent, setEditingStudent] = useState<StudentData | null>(
		null
	);
	const [editStudentId, setEditStudentId] = useState("");
	const [editCourse, setEditCourse] = useState("");
	const [editGrade, setEditGrade] = useState("");
	const [editPreference, setEditPreference] = useState("");

	const handleClearAll = () => {
		onDataChange([]);
		setNewStudentId("");
		setNewCourse("");
		setNewGrade("");
		setNewPreference("");
		setIsClearDialogOpen(false);
		toast({
			title: "Data Cleared",
			description: "All student data has been cleared.",
		});
	};

	const validateStudentData = (
		student: Omit<StudentData, "id">,
		existingData: StudentData[] = data,
		isEdit: boolean = false,
		editingId?: string
	): string | null => {
		if (!/^\d+$/.test(student.studentId)) {
			return "Student ID must be numeric";
		}

		const course = courses.find((c) => c.course === student.course);
		if (!course) {
			return "Invalid course selected";
		}

		if (student.grade < 0 || student.grade > 10) {
			return "Grade must be between 0 and 10";
		}

		if (!Number.isInteger(student.preference) || student.preference < 1) {
			return "Preference must be a positive integer";
		}

		const duplicateEntry = existingData.find(
			(entry) =>
				entry.studentId === student.studentId &&
				entry.course === student.course &&
				(!isEdit || entry.id !== editingId)
		);

		if (duplicateEntry) {
			return `Student ${student.studentId} is already registered for course ${student.course}`;
		}

		return null;
	};

	const handleEditRow = (studentData: StudentData) => {
		setEditingStudent(studentData);
		setEditStudentId(studentData.studentId);
		setEditCourse(studentData.course);
		setEditGrade(studentData.grade.toString());
		setEditPreference(studentData.preference.toString());
		setIsEditDialogOpen(true);
	};

	const handleSaveEdit = () => {
		if (!editingStudent) return;

		const newStudentData = {
			studentId: editStudentId,
			course: editCourse,
			grade: Number(editGrade),
			preference: Number(editPreference),
		};

		const error = validateStudentData(
			newStudentData,
			data,
			true,
			editingStudent.id
		);
		if (error) {
			toast({
				variant: "destructive",
				title: "Invalid Input",
				description: error,
			});
			return;
		}

		const updatedData = data.map((item) =>
			item.id === editingStudent.id
				? { ...item, ...newStudentData }
				: item
		);

		onDataChange(updatedData);
		setIsEditDialogOpen(false);
		setEditingStudent(null);

		toast({
			title: "Student Updated",
			description: "The student record has been successfully updated.",
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
					<div className="flex gap-2">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => handleEditRow(row.original)}
							className="h-8 w-8 p-0">
							<Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => handleDeleteRow(row.original.id)}
							className="h-8 w-8 p-0">
							<Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
						</Button>
					</div>
				);
			},
		},
	];

	const handleAddRow = () => {
		const newStudentData = {
			studentId: newStudentId,
			course: newCourse,
			grade: Number(newGrade),
			preference: Number(newPreference),
		};

		const error = validateStudentData(newStudentData);
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
				...newStudentData,
			},
		]);

		// Reset form
		setNewStudentId("");
		setNewCourse("");
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

	const validateFileData = (
		headers: string[],
		rows: any[]
	): { isValid: boolean; errors: string[] } => {
		const errors: string[] = [];
		const studentCourses = new Set<string>();

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
			const rowNumber = index + 2; // starting in zero and header

			// Check Student ID
			if (!row["Student ID"] || !/^\d+$/.test(row["Student ID"])) {
				errors.push(
					`Row ${rowNumber}: Invalid Student ID (must be numeric)`
				);
				return;
			}

			// Check Course Name
			const courseName = row["Course Name"];
			if (!courseName || !courses.some((c) => c.course === courseName)) {
				errors.push(`Row ${rowNumber}: Invalid or unknown Course Name`);
				return;
			}

			// Check for duplicate student-course combination
			const studentCourseKey = `${row["Student ID"]}-${courseName}`;
			if (studentCourses.has(studentCourseKey)) {
				errors.push(
					`Row ${rowNumber}: Student ${row["Student ID"]} is already registered for course ${courseName}`
				);
				return;
			}
			studentCourses.add(studentCourseKey);

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
				<div className="flex gap-2">
					<Dialog
						open={isClearDialogOpen}
						onOpenChange={setIsClearDialogOpen}>
						<DialogTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className="gap-2">
								<XCircle className="w-4 h-4" />
								Clear All
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Clear All Data</DialogTitle>
								<DialogDescription>
									Are you sure you want to clear all student
									data? This action cannot be undone.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setIsClearDialogOpen(false)}>
									Cancel
								</Button>
								<Button
									variant="destructive"
									onClick={handleClearAll}>
									Clear All
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
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
			</div>

			<div
				{...getRootProps()}
				className={`
                    p-6 border-2 border-dashed rounded-lg 
                    transition-colors duration-200 ease-in-out
                    flex flex-col items-center justify-center
                    ${
						isDragActive
							? "border-primary bg-primary/5"
							: "border-border"
					}
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

			<div className="flex flex-wrap gap-4">
				<Input
					placeholder="Student ID"
					value={newStudentId}
					onChange={(e) => setNewStudentId(e.target.value)}
					className="flex-1 min-w-[200px]"
				/>
				<Select value={newCourse} onValueChange={setNewCourse}>
					<SelectTrigger className="flex-1 min-w-[200px]">
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
					placeholder="Grade"
					type="number"
					step="0.1"
					min="0"
					max="10"
					value={newGrade}
					onChange={(e) => setNewGrade(e.target.value)}
					className="w-32 min-w-[120px]"
				/>
				<Input
					placeholder="Preference"
					type="number"
					min="1"
					value={newPreference}
					onChange={(e) => setNewPreference(e.target.value)}
					className="w-32 min-w-[120px]"
				/>
				<Button
					onClick={handleAddRow}
					disabled={
						!newStudentId ||
						!newCourse ||
						!newGrade ||
						!newPreference
					}
					className="shrink-0">
					<Plus className="w-4 h-4 mr-2" />
					Add
				</Button>
			</div>

			<div className="border rounded-md">
				<DataTable columns={columns} data={data} />
			</div>

			{/* Edit Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Student Record</DialogTitle>
						<DialogDescription>
							Make changes to the student record below.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<label
								htmlFor="editStudentId"
								className="text-right">
								Student ID
							</label>
							<Input
								id="editStudentId"
								value={editStudentId}
								onChange={(e) =>
									setEditStudentId(e.target.value)
								}
								className="col-span-3"
							/>
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<label className="text-right">Course</label>
							<Select
								value={editCourse}
								onValueChange={setEditCourse}>
								<SelectTrigger className="col-span-3">
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
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<label htmlFor="editGrade" className="text-right">
								Grade
							</label>
							<Input
								id="editGrade"
								type="number"
								step="0.1"
								min="0"
								max="10"
								value={editGrade}
								onChange={(e) => setEditGrade(e.target.value)}
								className="col-span-3"
							/>
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<label
								htmlFor="editPreference"
								className="text-right">
								Preference
							</label>
							<Input
								id="editPreference"
								type="number"
								min="1"
								value={editPreference}
								onChange={(e) =>
									setEditPreference(e.target.value)
								}
								className="col-span-3"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsEditDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleSaveEdit}
							disabled={
								!editStudentId ||
								!editCourse ||
								!editGrade ||
								!editPreference
							}>
							Save Changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default StudentInput;
