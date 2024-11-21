import React, { useState } from "react";
import { Check, CircleDot } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StepStatus = "complete" | "current" | "pending";

interface Step {
	title: string;
	description: string;
	status: StepStatus;
	content: React.ReactNode;
}

const StepIcon: React.FC<{ status: StepStatus }> = ({ status }) => {
	if (status === "complete") {
		return <Check className="h-4 w-4 text-primary-foreground" />;
	} else if (status === "current") {
		return <CircleDot className="h-4 w-4 text-primary-foreground" />;
	}
	return <div className="h-4 w-4 rounded-full bg-muted" />;
};

interface VerticalStepperProps {
	steps?: Step[];
	className?: string;
	onStepComplete?: (stepIndex: number) => Promise<boolean> | boolean;
	onStepBack?: (stepIndex: number) => Promise<boolean> | boolean;
}

const Stepper: React.FC<VerticalStepperProps> = ({
	steps = [],
	className = "",
	onStepComplete,
	onStepBack,
}) => {
	const [currentStep, setCurrentStep] = useState(0);
	const [isProcessing, setIsProcessing] = useState(false);

	const getStepStatus = (index: number): StepStatus => {
		if (index < currentStep) return "complete";
		if (index === currentStep) return "current";
		return "pending";
	};

	const getStatusStyles = (status: StepStatus): string => {
		switch (status) {
			case "complete":
				return "border-primary bg-primary shadow-sm";
			case "current":
				return "border-primary bg-primary shadow-sm";
			default:
				return "border-border bg-background shadow-sm";
		}
	};

	const getTextStyles = (status: StepStatus): string => {
		switch (status) {
			case "complete":
				return "text-primary";
			case "current":
				return "text-foreground";
			default:
				return "text-muted-foreground";
		}
	};

	const handleNext = async () => {
		if (!isProcessing) {
			setIsProcessing(true);
			try {
				const canProceed = await onStepComplete?.(currentStep);
				if (canProceed) {
					if (currentStep < steps.length - 1) {
						setCurrentStep((prev) => prev + 1);
					}
				}
			} finally {
				setIsProcessing(false);
			}
		}
	};

	const handleBack = async () => {
		if (currentStep > 0 && !isProcessing) {
			setIsProcessing(true);
			try {
				const canGoBack = await onStepBack?.(currentStep);
				if (canGoBack) {
					setCurrentStep((prev) => prev - 1);
				}
			} finally {
				setIsProcessing(false);
			}
		}
	};

	return (
		<Card className={cn("h-[calc(100vh-2rem)] mx-4 my-4", className)}>
			<div className="flex h-full divide-x">
				{/* Left side navigation */}
				<div className="shrink-0 w-72 p-6">
					<div className="flex flex-col space-y-6">
						{steps.map((step, index) => (
							<div key={index} className="relative flex gap-4">
								{/* Icon and line container */}
								<div className="relative">
									<div
										className={cn(
											"flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ease-in-out relative z-10 bg-background",
											getStatusStyles(
												getStepStatus(index)
											)
										)}>
										<StepIcon
											status={getStepStatus(index)}
										/>
									</div>

									{/* Vertical line */}
									{index !== steps.length - 1 && (
										<div
											className={cn(
												"absolute top-10 left-1/2 h-[calc(100%+1.5rem)] w-0.5 -translate-x-1/2",
												index < currentStep
													? "bg-primary"
													: "bg-border"
											)}
										/>
									)}
								</div>

								{/* Text content */}
								<div className="flex flex-col pt-1.5">
									<h3
										className={cn(
											"text-sm font-medium",
											getTextStyles(getStepStatus(index))
										)}>
										{step.title}
									</h3>
									<p
										className={cn(
											"text-xs mt-0.5",
											getStepStatus(index) === "current"
												? "text-muted-foreground"
												: "text-muted-foreground/60"
										)}>
										{step.description}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Right side content */}
				<div className="flex-1 flex flex-col p-6 min-w-0">
					{steps.map((step, index) => (
						<div
							key={index}
							className={cn(
								"h-full transition-opacity duration-200",
								index === currentStep ? "block" : "hidden"
							)}>
							<div className="h-full flex flex-col">
								<div className="flex-1 overflow-auto">
									{step.content}
								</div>
								<div className="flex justify-between pt-4 mt-4 border-t">
									<Button
										variant="outline"
										onClick={handleBack}
										disabled={
											currentStep === 0 || isProcessing
										}>
										Back
									</Button>
									<Button
										onClick={handleNext}
										disabled={isProcessing}>
										{isProcessing
											? "Processing..."
											: currentStep === steps.length - 1
											? "Complete"
											: "Next"}
									</Button>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</Card>
	);
};

export default Stepper;
