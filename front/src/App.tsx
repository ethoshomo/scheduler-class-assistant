import Stepper, { StepStatus } from "./components/widgets/stepper";
import CourseInput from "./components/widgets/course-input";

// Example usage with form content
const TestStepper: React.FC = () => {
	const steps = [
		{
			title: "Courses & Classes",
			description: "Enter the courses and their number of classes",
			content: (
				<div className="space-y-4">
					<CourseInput />
				</div>
			),
		},
		{
			title: "Tutors & Preference values",
			description: "Enter tutors details and preference values",
			content: (
				<div className="space-y-4">
					{/* Add your form fields here */}
					<p className="text-sm text-muted-foreground">
						Type or Upload File
					</p>
				</div>
			),
		},
		{
			title: "Settings",
			description: "Edit assistant settings",
			content: (
				<div className="space-y-4">
					{/* Add your form fields here */}
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
					{/* Add your form fields here */}
					<p className="text-sm text-muted-foreground">Review</p>
				</div>
			),
		},
	].map((step) => ({ ...step, status: "pending" as StepStatus }));

	const handleStepComplete = (stepIndex: number) => {
		console.log(`Step ${stepIndex} completed`);
	};

	const handleStepBack = (stepIndex: number) => {
		console.log(`Moved back from step ${stepIndex}`);
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
