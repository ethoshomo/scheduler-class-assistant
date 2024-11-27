import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Info } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const ALGORITHM_DESCRIPTIONS = {
	linear: "Uses linear programming to find the optimal allocation that maximizes overall preferences and grades. Guarantees the best possible solution but may take longer for large datasets.",
	genetic:
		"Uses genetic algorithms to evolve good solutions over multiple generations. Can quickly find good (but not necessarily optimal) solutions, especially useful for large datasets.",
};

type GeneticPreset = {
	name: string;
	description: string;
	generations: number;
	populationSize: number;
	detail: string;
};

export const GENETIC_PRESETS: Record<string, GeneticPreset> = {
	fast: {
		name: "Fast",
		description: "Quickest results, good for testing",
		generations: 50,
		populationSize: 500,
		detail: "Parameters: 50 generations, population size of 500",
	},
	balanced: {
		name: "Balanced",
		description: "Good balance between speed and quality",
		generations: 50,
		populationSize: 1000,
		detail: "Parameters: 50 generations, population size of 1,000",
	},
	quality: {
		name: "High Quality",
		description: "Best results, but takes longer",
		generations: 100,
		populationSize: 1000,
		detail: "Parameters: 100 generations, population size of 1,000",
	},
};

interface AlgorithmStepProps {
	selectedAlgorithm: string;
	onAlgorithmChange: (algorithm: string) => void;
	onParametersChange: (parameters: {
		minGrade: number;
		usePreference: number;
		generationNumber?: number;
		populationSize?: number;
	}) => void;
	disabled?: boolean;
	// Add these new props
	minGrade: number;
	onMinGradeChange: (value: number) => void;
	usePreference: number;
	onUsePreferenceChange: (value: number) => void;
	selectedPreset: string;
	onPresetChange: (value: string) => void;
}

const AlgorithmStep = ({
	selectedAlgorithm,
	onAlgorithmChange,
	onParametersChange,
	disabled,
	minGrade,
	onMinGradeChange,
	usePreference,
	onUsePreferenceChange,
	selectedPreset,
	onPresetChange,
}: AlgorithmStepProps) => {
	const handleAlgorithmChange = (value: string) => {
		onAlgorithmChange(value);
		if (value === "genetic") {
			const preset = GENETIC_PRESETS[selectedPreset];
			onParametersChange({
				minGrade,
				usePreference,
				generationNumber: preset.generations,
				populationSize: preset.populationSize,
			});
		} else {
			onParametersChange({
				minGrade,
				usePreference,
			});
		}
	};
	const handlePresetChange = (value: string) => {
		onPresetChange(value);
		const preset = GENETIC_PRESETS[value];
		onParametersChange({
			minGrade,
			usePreference,
			generationNumber: preset.generations,
			populationSize: preset.populationSize,
		});
	};

	const handleMinGradeChange = (value: string) => {
		const grade = parseFloat(value);
		if (!isNaN(grade) && grade >= 0 && grade <= 10) {
			onMinGradeChange(grade);
			if (selectedAlgorithm === "genetic") {
				const preset = GENETIC_PRESETS[selectedPreset];
				onParametersChange({
					minGrade: grade,
					usePreference,
					generationNumber: preset.generations,
					populationSize: preset.populationSize,
				});
			} else {
				onParametersChange({
					minGrade: grade,
					usePreference,
				});
			}
		}
	};

	const handleUsePreferenceChange = (checked: boolean) => {
		onUsePreferenceChange(checked ? 1 : 0);
		if (selectedAlgorithm === "genetic") {
			const preset = GENETIC_PRESETS[selectedPreset];
			onParametersChange({
				minGrade,
				usePreference: checked ? 1 : 0,
				generationNumber: preset.generations,
				populationSize: preset.populationSize,
			});
		} else {
			onParametersChange({
				minGrade,
				usePreference: checked ? 1 : 0,
			});
		}
	};

	return (
		<div className="max-w-md mx-auto">
			<CardHeader>
				<CardTitle>Select Algorithm</CardTitle>
				<CardDescription>
					Configure the algorithm and its parameters for tutor
					allocation
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Label>Algorithm</Label>
						<HoverCard>
							<HoverCardTrigger asChild>
								<Info className="h-4 w-4 text-muted-foreground" />
							</HoverCardTrigger>
							<HoverCardContent className="w-96">
								<div className="space-y-4">
									<div>
										<h4 className="text-sm font-semibold">
											Linear Programming Algorithm
										</h4>
										<p className="text-sm">
											{ALGORITHM_DESCRIPTIONS.linear}
										</p>
									</div>
									<div>
										<h4 className="text-sm font-semibold">
											Genetic Algorithm
										</h4>
										<p className="text-sm">
											{ALGORITHM_DESCRIPTIONS.genetic}
										</p>
									</div>
								</div>
							</HoverCardContent>
						</HoverCard>
					</div>
					<Select
						value={selectedAlgorithm}
						onValueChange={handleAlgorithmChange}
						disabled={disabled}>
						<SelectTrigger>
							<SelectValue placeholder="Select an algorithm" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="linear">
								Linear Programming Algorithm
							</SelectItem>
							<SelectItem value="genetic">
								Genetic Algorithm
							</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{selectedAlgorithm && (
					<>
						<div className="space-y-6 pt-4 border-t">
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<Label htmlFor="minGrade">
										Minimum Grade Required
									</Label>
									<HoverCard>
										<HoverCardTrigger asChild>
											<Info className="h-4 w-4 text-muted-foreground" />
										</HoverCardTrigger>
										<HoverCardContent className="w-80">
											<p className="text-sm">
												Only tutors with grades above
												this threshold (0-10) will be
												considered for allocation
											</p>
										</HoverCardContent>
									</HoverCard>
								</div>
								<Input
									id="minGrade"
									type="number"
									step="0.1"
									min="0"
									max="10"
									value={minGrade}
									onChange={(e) =>
										handleMinGradeChange(e.target.value)
									}
									disabled={disabled}
								/>
							</div>

							<div className="flex items-center justify-between space-x-2">
								<div className="space-y-0.5">
									<div className="flex items-center gap-2">
										<Label>Consider Preferences</Label>
										<HoverCard>
											<HoverCardTrigger asChild>
												<Info className="h-4 w-4 text-muted-foreground" />
											</HoverCardTrigger>
											<HoverCardContent className="w-80">
												<p className="text-sm">
													When enabled, tutor
													preferences will affect
													their final scores,
													potentially leading to more
													satisfactory allocations
												</p>
											</HoverCardContent>
										</HoverCard>
									</div>
								</div>
								<Switch
									checked={usePreference === 1}
									onCheckedChange={handleUsePreferenceChange}
									disabled={disabled}
								/>
							</div>

							{selectedAlgorithm === "genetic" && (
								<div className="space-y-3">
									<div className="flex items-center gap-2">
										<Label>Configuration Preset</Label>
										<HoverCard>
											<HoverCardTrigger asChild>
												<Info className="h-4 w-4 text-muted-foreground" />
											</HoverCardTrigger>
											<HoverCardContent className="w-80">
												<p className="text-sm">
													Choose a preset
													configuration that balances
													processing time and result
													quality
												</p>
											</HoverCardContent>
										</HoverCard>
									</div>
									<RadioGroup
										value={selectedPreset}
										onValueChange={handlePresetChange}
										className="gap-4"
										disabled={disabled}>
										{Object.entries(GENETIC_PRESETS).map(
											([key, preset]) => (
												<div
													key={key}
													className="flex items-center space-x-2">
													<RadioGroupItem
														value={key}
														id={key}
													/>
													<Label
														htmlFor={key}
														className="flex flex-col">
														<div className="flex items-center gap-2">
															<span className="font-medium">
																{preset.name}
															</span>
															<HoverCard>
																<HoverCardTrigger
																	asChild>
																	<Info className="h-4 w-4 text-muted-foreground" />
																</HoverCardTrigger>
																<HoverCardContent className="w-80">
																	<p className="text-sm font-medium">
																		{
																			preset.detail
																		}
																	</p>
																</HoverCardContent>
															</HoverCard>
														</div>
														<span className="text-sm text-muted-foreground">
															{preset.description}
														</span>
													</Label>
												</div>
											)
										)}
									</RadioGroup>
								</div>
							)}
						</div>
					</>
				)}
			</CardContent>
		</div>
	);
};

export default AlgorithmStep;
