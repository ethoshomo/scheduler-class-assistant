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
import { useToast } from "@/hooks/use-toast";

export interface CourseData {
	id: string;
	course: string;
	classes: number;
}

interface CourseInputProps {
	onDataChange: (data: CourseData[]) => void;
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

const CourseInput = ({ onDataChange }: CourseInputProps) => {
	const [data, setData] = useState<CourseData[]>([]);
	const [newCourse, setNewCourse] = useState("");
	const [newClasses, setNewClasses] = useState("");
	const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
	const { toast } = useToast();

	// Edit dialog state
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editingCourse, setEditingCourse] = useState<CourseData | null>(null);
	const [editCourse, setEditCourse] = useState("");
	const [editClasses, setEditClasses] = useState("");

	const handleClearAll = () => {
		setData([]);
		setNewCourse("");
		setNewClasses("");
		onDataChange([]);
		setIsClearDialogOpen(false);
		toast({
			title: "Data Cleared",
			description: "All course data has been cleared.",
		});
	};

	const handleEditRow = (courseData: CourseData) => {
		setEditingCourse(courseData);
		setEditCourse(courseData.course);
		setEditClasses(courseData.classes.toString());
		setIsEditDialogOpen(true);
	};

	const handleSaveEdit = () => {
		if (!editingCourse) return;

		// Check for duplicate course name if name changed
		if (
			editCourse !== editingCourse.course &&
			data.some(
				(item) => item.course.toLowerCase() === editCourse.toLowerCase()
			)
		) {
			toast({
				variant: "destructive",
				title: "Duplicate Course Name",
				description: `A course with the name "${editCourse}" already exists.`,
			});
			return;
		}

		const updatedData = data.map((item) =>
			item.id === editingCourse.id
				? {
						...item,
						course: editCourse,
						classes: parseInt(editClasses),
				  }
				: item
		);

		setData(updatedData);
		onDataChange(updatedData);
		setIsEditDialogOpen(false);
		setEditingCourse(null);

		toast({
			title: "Course Updated",
			description: "The course has been successfully updated.",
		});
	};

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
				if (courseNames.has(courseName.toLowerCase())) {
					errors.push(
						`Row ${rowNumber}: Duplicate course name "${courseName}"`
					);
				} else {
					courseNames.add(courseName.toLowerCase());
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
		const newData = data.filter((row) => row.id !== id);
		setData(newData);
		onDataChange(newData);
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
		if (newCourse && newClasses) {
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

			const newData = [
				...data,
				{
					id: crypto.randomUUID(),
					course: newCourse,
					classes: parseInt(newClasses),
				},
			];

			setData(newData);
			onDataChange(newData);
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
						course: row["Course Name"],
						classes: parseInt(row["Number of Classes"]),
					}));

					setData(validData);
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
						course: (row as any)["Course Name"],
						classes: Number((row as any)["Number of Classes"]),
					}));

					setData(validData);
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
				<h3 className="text-lg font-medium">Course Details</h3>
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
									Are you sure you want to clear all course
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
					min="1"
					value={newClasses}
					onChange={(e) => setNewClasses(e.target.value)}
					className="w-40"
				/>
				<Button
					onClick={handleAddRow}
					disabled={
						!newCourse || !newClasses || parseInt(newClasses) < 1
					}>
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
						<DialogTitle>Edit Course</DialogTitle>
						<DialogDescription>
							Make changes to the course details below.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<label htmlFor="editCourse" className="text-right">
								Course Name
							</label>
							<Input
								id="editCourse"
								value={editCourse}
								onChange={(e) => setEditCourse(e.target.value)}
								className="col-span-3"
							/>
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<label htmlFor="editClasses" className="text-right">
								Number of Classes
							</label>
							<Input
								id="editClasses"
								type="number"
								min="1"
								value={editClasses}
								onChange={(e) => setEditClasses(e.target.value)}
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
								!editCourse ||
								!editClasses ||
								parseInt(editClasses) < 1
							}>
							Save Changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default CourseInput;
