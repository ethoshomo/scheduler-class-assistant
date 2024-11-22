import { useState } from "react";
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardDescription,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import Stepper, { StepStatus } from "./components/widgets/stepper";
import CourseInput, { CourseData } from "./components/course-input";
import StudentInput, { StudentData } from "./components/student-input";
import { useToast } from "@/hooks/use-toast";
import { invoke } from "@tauri-apps/api/core";
import { writeFile, BaseDirectory, mkdir } from "@tauri-apps/plugin-fs";
import { appConfigDir, join } from "@tauri-apps/api/path";
import * as XLSX from "xlsx";

interface AllocationResult {
	metrics: {
		best_individual: number[];
		number_classes: number;
		satisfaction: number;
	};
	results: {
		class: string;
		student: string;
		grade: number;
		preference: Record<string, number>;
	}[];
}

const App = () => {
	const [courseData, setCourseData] = useState<CourseData[]>([]);
	const [studentData, setStudentData] = useState<StudentData[]>([]);
	const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [allocationResult, setAllocationResult] =
		useState<AllocationResult | null>(null);
	const { toast } = useToast();

	const handleCourseDataChange = (newCourseData: CourseData[]) => {
		setCourseData(newCourseData);
		setStudentData([]);
	};

	const processDataWithBackend = async () => {
		if (isProcessing) return false;

		setIsProcessing(true);
		try {
			toast({
				title: "Processing Data",
				description: "Starting allocation process...",
			});

			if (selectedAlgorithm === "genetic") {
				// Prepare student data for the genetic algorithm
				const processedStudentData = studentData.map((student) => ({
					"Student ID": parseInt(student.studentId),
					"Course Name": student.course,
					Grade: student.grade,
					Preference: student.preference,
				}));

				// Create workbook for student data
				const studentWs =
					XLSX.utils.json_to_sheet(processedStudentData);
				const studentWb = XLSX.utils.book_new();
				XLSX.utils.book_append_sheet(studentWb, studentWs, "Data");

				// Convert to array buffer
				const studentWbout = XLSX.write(studentWb, {
					bookType: "xlsx",
					type: "array",
				});
				const studentBuffer = new Uint8Array(studentWbout);

				// Prepare course data
				const processedCourseData = courseData.map((course) => ({
					"Course Name": course.course,
					"Number of Classes": course.classes,
				}));

				// Create workbook for course data
				const courseWs = XLSX.utils.json_to_sheet(processedCourseData);
				const courseWb = XLSX.utils.book_new();
				XLSX.utils.book_append_sheet(courseWb, courseWs, "Data");

				// Convert to array buffer
				const courseWbout = XLSX.write(courseWb, {
					bookType: "xlsx",
					type: "array",
				});
				const courseBuffer = new Uint8Array(courseWbout);

				// Ensure directory exists
				await mkdir("", {
					baseDir: BaseDirectory.AppConfig,
					recursive: true,
				});

				// Write student data file
				const studentFilename = "temp_student_data.xlsx";
				await writeFile(studentFilename, studentBuffer, {
					baseDir: BaseDirectory.AppConfig,
				});

				// Write course data file
				const courseFilename = "temp_course_data.xlsx";
				await writeFile(courseFilename, courseBuffer, {
					baseDir: BaseDirectory.AppConfig,
				});

				// Get the absolute file paths
				const configDir = await appConfigDir();
				const tutorsDataFilePath = await join(
					configDir,
					studentFilename
				);
				const coursesDataFilePath = await join(
					configDir,
					courseFilename
				);

				// Process with genetic algorithm
				const result = await invoke("run_genetic", {
					tutorsDataFilePath,
					coursesDataFilePath,
				});

				console.log(result);

				if (typeof result === "object" && result !== null) {
					const typedResult = result as { data?: AllocationResult };
					if (typedResult.data) {
						setAllocationResult(typedResult.data);
						toast({
							title: "Success",
							description: "Allocation completed successfully!",
						});
						return true;
					}
				}
				throw new Error("Invalid response from genetic algorithm");
			} else if (selectedAlgorithm === "simplex") {
				// Implement simplex algorithm processing here if needed
				toast({
					variant: "destructive",
					title: "Not Implemented",
					description: "Simplex algorithm is not yet implemented.",
				});
				return false;
			}

			return false;
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

	const AlgorithmSelectionStep = () => (
		<div className="space-y-6">
			<div className="max-w-md mx-auto">
				<CardHeader>
					<CardTitle>Select Algorithm</CardTitle>
					<CardDescription>
						Choose the algorithm to use for tutor allocation
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Select
						value={selectedAlgorithm}
						onValueChange={setSelectedAlgorithm}
						disabled={isProcessing}>
						<SelectTrigger>
							<SelectValue placeholder="Select an algorithm" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="simplex">
								Simplex Algorithm
							</SelectItem>
							<SelectItem value="genetic">
								Genetic Algorithm
							</SelectItem>
						</SelectContent>
					</Select>
				</CardContent>
			</div>
		</div>
	);

	const ProcessingStep = () => (
		<div className="flex flex-col items-center justify-center h-full space-y-4">
			<Loader2 className="h-8 w-8 animate-spin text-primary" />
			<p className="text-lg font-medium">Processing Data</p>
			<p className="text-sm text-muted-foreground">
				Please wait while we allocate tutors to courses...
			</p>
			<p className="text-sm text-muted-foreground">
				Using {selectedAlgorithm === "simplex" ? "Simplex" : "Genetic"}{" "}
				Algorithm
			</p>
		</div>
	);

	const ResultsStep = () => (
		<div className="space-y-6">
			<CardHeader>
				<CardTitle>Allocation Results</CardTitle>
				<CardDescription>
					Results using{" "}
					{selectedAlgorithm === "simplex" ? "Simplex" : "Genetic"}{" "}
					Algorithm
				</CardDescription>
			</CardHeader>
			<CardContent>
				{allocationResult && (
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Summary Metrics</CardTitle>
							</CardHeader>
							<CardContent>
								<dl className="grid grid-cols-3 gap-4">
									<div>
										<dt className="text-sm font-medium text-muted-foreground">
											Classes Allocated
										</dt>
										<dd className="text-2xl font-bold">
											{
												allocationResult.metrics
													.number_classes
											}
										</dd>
									</div>
									<div>
										<dt className="text-sm font-medium text-muted-foreground">
											Satisfaction Score
										</dt>
										<dd className="text-2xl font-bold">
											{(
												allocationResult.metrics
													.satisfaction * 100
											).toFixed(1)}
											%
										</dd>
									</div>
								</dl>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Allocation Details</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="border rounded-lg divide-y">
									{allocationResult.results.map(
										(result, index) => (
											<div key={index} className="p-4">
												<div className="grid grid-cols-2 gap-4">
													<div>
														<p className="text-sm font-medium">
															Course
														</p>
														<p className="text-muted-foreground">
															{result.class}
														</p>
													</div>
													<div>
														<p className="text-sm font-medium">
															Assigned Tutor
														</p>
														<p className="text-muted-foreground">
															{result.student}
														</p>
													</div>
													<div>
														<p className="text-sm font-medium">
															Grade
														</p>
														<p className="text-muted-foreground">
															{result.grade}
														</p>
													</div>
												</div>
											</div>
										)
									)}
								</div>
							</CardContent>
						</Card>
					</div>
				)}
			</CardContent>
		</div>
	);

	const validateStep = async (stepIndex: number): Promise<boolean> => {
		if (isProcessing) return false;

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
				return true;

			case 2:
				if (!selectedAlgorithm) {
					toast({
						variant: "destructive",
						title: "No Algorithm Selected",
						description:
							"Please select an algorithm before proceeding.",
					});
					return false;
				}
				processDataWithBackend();
				return true;

			default:
				return true;
		}
	};

	const handleStepBack = async () => !isProcessing;

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
			title: "Tutors & Preferences",
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
		{
			title: "Algorithm Selection",
			description: "Choose the allocation algorithm",
			content: <AlgorithmSelectionStep />,
		},
		isProcessing
			? {
					title: "Processing",
					description: "Allocating tutors to courses",
					content: <ProcessingStep />,
			  }
			: {
					title: "Results",
					description: "View allocation results",
					content: <ResultsStep />,
			  },
	].map((step) => ({ ...step, status: "pending" as StepStatus }));

	return (
		<Stepper
			steps={steps}
			onStepComplete={validateStep}
			onStepBack={handleStepBack}
		/>
	);
};

export default App;
