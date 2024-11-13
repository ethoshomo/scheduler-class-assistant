import { useState } from "react";
import Stepper, { StepStatus } from "./components/widgets/stepper";
import CourseInput from "./components/course-input";
import StudentInput from "./components/student-input";
import { useToast } from "@/hooks/use-toast";
import { invoke } from "@tauri-apps/api/core";
import { writeFile, BaseDirectory, mkdir } from "@tauri-apps/plugin-fs";
import { appConfigDir, join } from "@tauri-apps/api/path";
import * as XLSX from "xlsx";

interface CourseData {
	id: string;
	course: string;
	classes: number;
}

interface StudentData {
	id: string;
	studentId: string;
	course: string;
	classNumber: number;
	grade: number;
	preference: number;
}

const TestStepper: React.FC = () => {
	const [courseData, setCourseData] = useState<CourseData[]>([]);
	const [studentData, setStudentData] = useState<StudentData[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);
	const { toast } = useToast();

	const handleCourseDataChange = (newCourseData: CourseData[]) => {
		setCourseData(newCourseData);
		setStudentData([]);
	};

	const processDataWithBackend = async () => {
		setIsProcessing(true);
		try {
			// Create combined data for export
			const processedData = studentData.map((student) => ({
				"Student ID": student.studentId,
				"Course Name": student.course.split(" - Class ")[0],
				"Class Number": student.classNumber,
				Grade: student.grade,
				Preference: student.preference,
			}));

			// Create workbook
			const ws = XLSX.utils.json_to_sheet(processedData);
			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, "Data");

			// Convert to array buffer
			const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
			const buffer = new Uint8Array(wbout);

			// Ensure directory exists
			await mkdir("", {
				baseDir: BaseDirectory.AppConfig,
				recursive: true,
			});

			const filename = "temp_data.xlsx";

			// Write file
			await writeFile(filename, buffer, {
				baseDir: BaseDirectory.AppConfig,
			});

			// Get the absolute file path
			const configDir = await appConfigDir();
			const filePath = await join(configDir, filename);

			// Process with Python backend
			const result = await invoke("process_data", {
				filePath: filePath,
			});

			toast({
				title: "Success",
				description: "Data processed successfully!",
			});

			console.log("Backend processing result:", result);
			return true;
		} catch (error) {
			console.error("Error processing data:", error);
			toast({
				variant: "destructive",
				title: "Processing Error",
				description:
					error instanceof Error
						? error.message
						: "An error occurred while processing the data",
			});
			return false;
		} finally {
			setIsProcessing(false);
		}
	};

	const validateStep = async (stepIndex: number): Promise<boolean> => {
		switch (stepIndex) {
			case 0:
				if (courseData.length === 0) {
					toast({
						variant: "destructive",
						title: "Empty Course Data",
						description:
							"Please add at least one course before proceeding.",
					});
					return false;
				}
				return true;

			case 1:
				if (studentData.length === 0) {
					toast({
						variant: "destructive",
						title: "Empty Student Data",
						description:
							"Please add at least one student before proceeding.",
					});
					return false;
				}
				// Process data with backend when completing step 2
				return await processDataWithBackend();

			default:
				return true;
		}
	};

	const steps = [
		{
			title: "Courses & Classes",
			description: "Enter the courses and their number of classes",
			content: (
				<div className="space-y-4">
					<CourseInput onDataChange={handleCourseDataChange} />
				</div>
			),
		},
		{
			title: "Tutors & Preference values",
			description: "Enter tutors details and preference values",
			content: (
				<div className="space-y-4">
					<StudentInput
						courses={courseData}
						data={studentData}
						onDataChange={setStudentData}
					/>
				</div>
			),
		},
	].map((step) => ({ ...step, status: "pending" as StepStatus }));

	const handleStepComplete = async (stepIndex: number) => {
		if (isProcessing) return false;
		return await validateStep(stepIndex);
	};

	// Simple implementation since we don't need special validation for going back
	const handleStepBack = async () => true;

	return (
		<Stepper
			steps={steps}
			onStepComplete={handleStepComplete}
			onStepBack={handleStepBack}
		/>
	);
};

export default function App() {
	return <TestStepper />;
}
