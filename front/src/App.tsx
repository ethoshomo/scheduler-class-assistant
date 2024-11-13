import { useState } from "react";
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

const TestStepper: React.FC = () => {
	const [courseData, setCourseData] = useState<CourseData[]>([]);
	const [studentData, setStudentData] = useState<StudentData[]>([]);
	const { toast } = useToast();

	const handleCourseDataChange = (newCourseData: CourseData[]) => {
		setCourseData(newCourseData);
		setStudentData([]);
	};

	const validateStep = (stepIndex: number): boolean => {
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

			// Add validation for other steps as needed
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
		{
			title: "Settings",
			description: "Edit assistant settings",
			content: (
				<div className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Type or Upload File
					</p>
				</div>
			),
		},
		{
			title: "Review",
			description: "Review the information",
			content: (
				<div className="space-y-4">
					<p className="text-sm text-muted-foreground">Review</p>
				</div>
			),
		},
	].map((step) => ({ ...step, status: "pending" as StepStatus }));

	const handleStepComplete = (stepIndex: number) => {
		if (!validateStep(stepIndex)) {
			return false;
		}
		console.log(`Step ${stepIndex} completed`);
		return true;
	};

	const handleStepBack = (stepIndex: number) => {
		console.log(`Moved back from step ${stepIndex}`);
		return true;
	};

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
