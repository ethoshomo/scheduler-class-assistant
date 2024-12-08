import { useState } from "react";
import { Loader2 } from "lucide-react";
import Stepper, { StepStatus } from "./components/widgets/stepper";
import CourseInput, { CourseData } from "./components/course-input";
import StudentInput, { StudentData } from "./components/student-input";
import { useToast } from "@/hooks/use-toast";
import { invoke } from "@tauri-apps/api/core";
import { exit } from "@tauri-apps/plugin-process";
import { writeFile, BaseDirectory, mkdir } from "@tauri-apps/plugin-fs";
import { appConfigDir, join } from "@tauri-apps/api/path";
import * as XLSX from "xlsx";
import { Button } from "./components/ui/button";
import ResultsStep, { AllocationResult } from "./components/steps/results-step";
import AlgorithmStep, { GENETIC_PRESETS } from "./components/steps/algorithm-step";

const App = () => {
	const [currentCommand, setCurrentCommand] = useState<string | null>(null);
	const [courseData, setCourseData] = useState<CourseData[]>([]);
	const [studentData, setStudentData] = useState<StudentData[]>([]);
	const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [allocationResult, setAllocationResult] =
		useState<AllocationResult | null>(null);
	const [stepperKey, setStepperKey] = useState(0);
	const [algorithmParameters, setAlgorithmParameters] = useState<{
		minGrade: number;
		usePreference: number;
		generationNumber?: number;
		populationSize?: number;
	} | null>(null);
	const [minGrade, setMinGrade] = useState(7.0);
	const [usePreference, setUsePreference] = useState(1);
	const [selectedPreset, setSelectedPreset] = useState("balanced");

	const { toast } = useToast();

	const handleStartOver = () => {
		// Clear all data
		setCourseData([]);
		setStudentData([]);
		setSelectedAlgorithm("");
		setAllocationResult(null);
		setIsProcessing(false);
		setCurrentCommand(null);
		// Increment the key to force a complete Stepper reset
		setStepperKey((prev) => prev + 1);

		toast({
			title: "Reset Complete",
			description: "All data has been cleared. You can start over.",
		});
	};

	const handleExit = async () => {
		try {
			await exit(0);
		} catch (error) {
			console.error("Error while exiting:", error);
			toast({
				variant: "destructive",
				title: "Exit Error",
				description:
					"Failed to close the application. Please try again.",
			});
		}
	};

	const handleCourseDataChange = (newCourseData: CourseData[]) => {
		setCourseData(newCourseData);
		setStudentData([]);
	};

	const processDataWithBackend = async () => {
		if (isProcessing || !algorithmParameters) return false;

		setIsProcessing(true);
		const commandId = crypto.randomUUID();
		setCurrentCommand(commandId);

		try {
			toast({
				title: "Processing Data",
				description: "Starting allocation process...",
			});

			// Prepare student data
			const processedStudentData = studentData.map((student) => ({
				"Student ID": parseInt(student.studentId),
				"Course Name": student.course,
				Grade: student.grade,
				Preference: student.preference,
			}));

			// Create workbook for student data
			const studentWs = XLSX.utils.json_to_sheet(processedStudentData);
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
			const tutorsDataFilePath = await join(configDir, studentFilename);
			const coursesDataFilePath = await join(configDir, courseFilename);

			const result = await invoke("run_algorithm", {
				algorithm: selectedAlgorithm,
				tutorsDataFilePath,
				coursesDataFilePath,
				commandId,
				minGrade: algorithmParameters.minGrade,
				preferenceFlag: algorithmParameters.usePreference,
				generationNumber: algorithmParameters.generationNumber,
				populationSize: algorithmParameters.populationSize,
			});

			if (typeof result === "object" && result !== null) {
				const typedResult = result as { data?: AllocationResult };
				if (typedResult.data) {
					setIsProcessing(false); // First, stop processing
					setAllocationResult(typedResult.data); // Then set the result
					toast({
						title: "Success",
						description: "Allocation completed successfully!",
					});
					return true;
				}
			}
			throw new Error(
				`Invalid response from ${selectedAlgorithm} algorithm`
			);
		} catch (error: unknown) {
			if (commandId === currentCommand) {
				console.error("Error processing data:", error);
				toast({
					variant: "destructive",
					title: "Processing Error",
					description:
						error instanceof Error
							? error.message
							: "An error occurred while processing the data",
				});
			}
			return false;
		} finally {
			// Only cleanup if this is still the current command
			if (commandId === currentCommand) {
				setIsProcessing(false);
				setCurrentCommand(null);
			}
		}
	};

	const handleCancel = () => {
		if (isProcessing && currentCommand) {
			// Send cancellation command to Rust backend
			invoke("cancel_algorithm", { commandId: currentCommand }).catch(
				console.error
			);

			setIsProcessing(false);
			setCurrentCommand(null);
			setAllocationResult(null);
			setSelectedAlgorithm("");

			toast({
				variant: "default",
				title: "Processing Cancelled",
				description: "The allocation process was cancelled.",
			});

			return true; // Allow return to algorithm selection
		}
		return false;
	};

	const AlgorithmSelectionStep = () => {
		const handleAlgorithmChange = (algorithm: string) => {
			setSelectedAlgorithm(algorithm);
			if (algorithm === "genetic") {
				const preset = GENETIC_PRESETS[selectedPreset];
				setAlgorithmParameters({
					minGrade,
					usePreference,
					generationNumber: preset.generations,
					populationSize: preset.populationSize,
				});
			} else {
				setAlgorithmParameters({
					minGrade,
					usePreference,
				});
			}
		};

		const handleParametersChange = (params: {
			minGrade: number;
			usePreference: number;
			generationNumber?: number;
			populationSize?: number;
		}) => {
			setAlgorithmParameters(params);
		};

		return (
			<AlgorithmStep
				selectedAlgorithm={selectedAlgorithm}
				onAlgorithmChange={handleAlgorithmChange}
				onParametersChange={handleParametersChange}
				disabled={isProcessing}
				minGrade={minGrade}
				onMinGradeChange={setMinGrade}
				usePreference={usePreference}
				onUsePreferenceChange={setUsePreference}
				selectedPreset={selectedPreset}
				onPresetChange={setSelectedPreset}
			/>
		);
	};

	const ProcessingStep = () => (
		<div className="flex flex-col items-center justify-center h-full space-y-4">
			<Loader2 className="h-8 w-8 animate-spin text-primary" />
			<p className="text-lg font-medium">Processing Data</p>
			<p className="text-sm text-muted-foreground">
				Please wait while we allocate tutors to courses...
			</p>
			<p className="text-sm text-muted-foreground">
				Using{" "}
				{selectedAlgorithm === "integer_programming"
					? "Integer Programming"
					: "Genetic"}{" "}
				Algorithm
			</p>
		</div>
	);

	const validateStep = async (stepIndex: number): Promise<boolean> => {
		if (isProcessing) {
			return handleCancel();
		}

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
				if (!algorithmParameters) {
					toast({
						variant: "destructive",
						title: "Invalid Parameters",
						description:
							"Please configure the algorithm parameters before proceeding.",
					});
					return false;
				}
				// Start processing
				processDataWithBackend();
				return true;

			case 3:
				// Don't allow manual advancement during processing
				return !isProcessing;

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
		{
			title: isProcessing ? "Processing" : "Results",
			description: isProcessing
				? "Allocating tutors to courses"
				: "View allocation results",
			content: isProcessing ? (
				<ProcessingStep />
			) : (
				<ResultsStep
					allocationResult={allocationResult}
					selectedAlgorithm={selectedAlgorithm}
				/>
			),
			actions:
				allocationResult && !isProcessing ? (
					<div className="flex justify-between w-full">
						<Button
							variant="secondary"
							onClick={handleStartOver}
							className="mr-2">
							Start Over
						</Button>
						<Button variant="destructive" onClick={handleExit}>
							Exit
						</Button>
					</div>
				) : undefined,
		},
	].map((step) => ({ ...step, status: "pending" as StepStatus }));

	return (
		<Stepper
			key={stepperKey}
			steps={steps}
			onStepComplete={validateStep}
			onStepBack={handleStepBack}
			isProcessing={isProcessing}
			forceStep={allocationResult && !isProcessing ? 3 : undefined}
			hideDefaultButtons={Boolean(allocationResult && !isProcessing)}
		/>
	);
};

export default App;
