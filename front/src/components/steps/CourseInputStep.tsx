import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	DataTable,
	DataTableColumn,
	FileInput,
} from "@/components/widgets/data-table";
import { Trash2, Pencil, Plus, XCircle } from "lucide-react";
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

interface CourseInputStepProps {
	onDataChange: (data: CourseData[]) => void;
}

const REQUIRED_COLUMNS = ["Course Name", "Number of Classes"];
const TEMPLATE_DATA = [
	{
		"Course Name": "SMA0300 - Geometria Analítica",
		"Number of Classes": 1,
	},
	{
		"Course Name": "SMA0353 - Cálculo I",
		"Number of Classes": 2,
	},
];

export default function CourseInputStep({
	onDataChange,
}: CourseInputStepProps) {
	const [data, setData] = useState<CourseData[]>([]);
	const [newCourse, setNewCourse] = useState("");
	const [newClasses, setNewClasses] = useState("");
	const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editingCourse, setEditingCourse] = useState<CourseData | null>(null);
	const [editCourse, setEditCourse] = useState("");
	const [editClasses, setEditClasses] = useState("");
	const { toast } = useToast();

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

	const handleDeleteRow = (id: string) => {
		const newData = data.filter((row) => row.id !== id);
		setData(newData);
		onDataChange(newData);
	};

	const validateData = (
		data: any[]
	): { isValid: boolean; errors: string[] } => {
		const errors: string[] = [];
		const courseNames = new Set<string>();

		data.forEach((row, index) => {
			const rowNumber = index + 2; // starting in zero and header
			const courseName = row["Course Name"];

			// Check Course Name
			if (!courseName || typeof courseName !== "string") {
				errors.push(`Row ${rowNumber}: Invalid or missing Course Name`);
			} else {
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

	const handleFileData = (fileData: any[]) => {
		const newData = fileData.map((row) => ({
			id: crypto.randomUUID(),
			course: row["Course Name"],
			classes: Number(row["Number of Classes"]),
		}));
		setData(newData);
		onDataChange(newData);
	};

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

	const columns: DataTableColumn<CourseData>[] = [
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

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-medium">Course Details</h3>
				<Dialog
					open={isClearDialogOpen}
					onOpenChange={setIsClearDialogOpen}>
					<DialogTrigger asChild>
						<Button variant="outline" size="sm" className="gap-2">
							<XCircle className="w-4 h-4" />
							Clear All
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Clear All Data</DialogTitle>
							<DialogDescription>
								Are you sure you want to clear all course data?
								This action cannot be undone.
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
			</div>

			<FileInput<CourseData>
				onDataChange={handleFileData}
				templateData={TEMPLATE_DATA}
				requiredColumns={REQUIRED_COLUMNS}
				validateData={validateData}
				templateFilename="courses_template"
			/>

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
				<DataTable
					columns={columns}
					data={data}
					enableSorting
					enableFiltering
					filterableColumns={["course"]}
				/>
			</div>

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
}
