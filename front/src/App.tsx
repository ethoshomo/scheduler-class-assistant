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
import CourseInput from "./components/course-input";
import StudentInput from "./components/student-input";
import { useToast } from "@/hooks/use-toast";

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

const AlgorithmSelector = () => {
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

			// Simulate backend processing - replace with actual backend call
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Mock result - replace with actual backend response
			const mockResult = {
				metrics: {
					best_individual: [1, 2, 3],
					number_classes: 3,
					satisfaction: 0.85,
				},
				results: [
					{
						class: "Course A",
						student: "12345",
						grade: 8.5,
						preference: { "Course A": 1 },
					},
				],
			};

			setAllocationResult(mockResult);

			toast({
				title: "Success",
				description: "Allocation completed successfully!",
			});

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
			title: "Processing",
			description: "Allocating tutors to courses",
			content: <ProcessingStep />,
		},
		{
			title: "Results",
			description: "View allocation results",
			content: <ResultsStep />,
		},
	].map((step) => ({ ...step, status: "pending" as StepStatus }));

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
				return true;

			case 3:
				return await processDataWithBackend();

			default:
				return true;
		}
	};

	const handleStepBack = async () => !isProcessing;

	return (
		<Stepper
			steps={steps}
			onStepComplete={validateStep}
			onStepBack={handleStepBack}
		/>
	);
};

export default AlgorithmSelector;
