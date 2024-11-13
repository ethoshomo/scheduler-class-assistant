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
	onStepComplete?: (stepIndex: number) => boolean;
	onStepBack?: (stepIndex: number) => boolean;
}

const Stepper: React.FC<VerticalStepperProps> = ({
	steps = [],
	className = "",
	onStepComplete,
	onStepBack,
}) => {
	const [currentStep, setCurrentStep] = useState(0);

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
				return "text-primary font-medium";
			case "current":
				return "text-primary font-medium";
			default:
				return "text-muted-foreground";
		}
	};

	const handleNext = () => {
		if (currentStep < steps.length - 1) {
			const canProceed = onStepComplete?.(currentStep);
			if (canProceed) {
				setCurrentStep((prev) => prev + 1);
			}
		}
	};

	const handleBack = () => {
		if (currentStep > 0) {
			const canGoBack = onStepBack?.(currentStep);
			if (canGoBack) {
				setCurrentStep((prev) => prev - 1);
			}
		}
	};

	return (
		<Card className={cn("max-w-3xl p-6", className)}>
			<div className="space-y-6">
				{steps.map((step, index) => {
					const status = getStepStatus(index);
					return (
						<div key={index} className="flex">
							{/* Left side with circle and line */}
							<div className="flex flex-col items-center">
								<div
									className={cn(
										`
                  flex h-10 w-10 items-center justify-center rounded-full border-2
                  transition-all duration-200 ease-in-out
                  `,
										getStatusStyles(status)
									)}>
									<StepIcon status={status} />
								</div>
								{index !== steps.length - 1 && (
									<div
										className={cn(
											`
                    w-0.5 h-16 -mb-2 transition-colors duration-200
                    `,
											status === "complete"
												? "bg-primary"
												: "bg-border"
										)}
									/>
								)}
							</div>

							{/* Right side with content */}
							<div className="ml-6 pb-8 flex-1">
								<div
									className={cn(
										"rounded-lg border bg-card p-4 shadow-sm",
										status === "current"
											? "border-primary"
											: "border-border"
									)}>
									<div className="space-y-2 mb-4">
										<p
											className={cn(
												"font-serif",
												getTextStyles(status)
											)}>
											{step.title}
										</p>
										<p className="text-sm text-muted-foreground font-medium">
											{step.description}
										</p>
									</div>

									{/* Form content */}
									<div
										className={cn(
											"transition-all duration-200",
											status === "current"
												? "block"
												: "hidden"
										)}>
										{step.content}

										{/* Navigation buttons */}
										<div className="flex justify-between mt-4 pt-4 border-t">
											<Button
												variant="outline"
												onClick={handleBack}
												disabled={currentStep === 0}>
												Back
											</Button>
											<Button
												onClick={handleNext}
												disabled={
													currentStep ===
													steps.length - 1
												}>
												{currentStep ===
												steps.length - 1
													? "Complete"
													: "Next"}
											</Button>
										</div>
									</div>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</Card>
	);
};

export default Stepper;
