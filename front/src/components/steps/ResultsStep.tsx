import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTableColumn } from "@/components/widgets/data-table";
import { DataTable } from "@/components/widgets/data-table";
import { Separator } from "@/components/ui/separator";

export interface AllocationMetrics {
	number_classes_allocated: number;
	total_classes: number;
	execution_time: number;
	average_grade: number;
}

export interface AllocationResult {
	metrics: AllocationMetrics;
	results: AllocationRow[];
}

interface AllocationRow {
	class: string;
	student: string;
	grade: number | string;
	preference: Record<string, number>;
}

interface ResultsStepProps {
	allocationResult: AllocationResult | null;
	selectedAlgorithm: string;
	algorithmParameters?: {
		minGrade: number;
		usePreference: number;
		generationNumber?: number;
		populationSize?: number;
	} | null;
}

const formatGrade = (value: unknown): string => {
	if (typeof value === "number") {
		return value.toFixed(1);
	}
	if (typeof value === "string") {
		return value === "No preference" ? "-" : value;
	}
	return "-";
};

const ResultsStep = ({
	allocationResult,
	selectedAlgorithm,
	algorithmParameters,
}: ResultsStepProps) => {
	const columns: DataTableColumn<AllocationRow>[] = [
		{
			accessorKey: "class",
			header: "Course",
			cell: ({ row }) => (
				<div className="font-medium">
					{String(row.getValue("class"))}
				</div>
			),
		},
		{
			accessorKey: "student",
			header: "Assigned Tutor",
			cell: ({ row }) => {
				const student = String(row.getValue("student"));
				return (
					<div
						className={
							student === "No tutor" ? "text-destructive" : ""
						}>
						{student}
					</div>
				);
			},
		},
		{
			accessorKey: "grade",
			header: "Grade",
			cell: ({ row }) => {
				const value = row.getValue("grade");
				return <div className="text-center">{formatGrade(value)}</div>;
			},
		},
	];

	if (!allocationResult) {
		return null;
	}

	const { metrics } = allocationResult;

	return (
		<div className="flex-1 space-y-6 overflow-auto">
			<Card>
				<CardHeader>
					<CardTitle>Summary Metrics</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-6">
						<div className="grid grid-cols-3 gap-4">
							<div>
								<dt className="text-sm font-medium text-muted-foreground">
									Algorithm Used
								</dt>
								<dd className="text-2xl font-bold">
									{selectedAlgorithm === "integer_programming"
										? "Integer Programming"
										: "Genetic"}
								</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-muted-foreground">
									Processing Time
								</dt>
								<dd className="text-2xl font-bold">
									{metrics.execution_time.toFixed(2)} s
								</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-muted-foreground">
									Classes Allocated
								</dt>
								<dd className="text-2xl font-bold">
									{metrics.number_classes_allocated} /{" "}
									{metrics.total_classes}
								</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-muted-foreground">
									Percentage Classes Allocated
								</dt>
								<dd className="text-2xl font-bold">
									{(
										(metrics.number_classes_allocated /
											metrics.total_classes) *
										100
									).toFixed(2)}{" "}
									%
								</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-muted-foreground">
									Average Grade Allocated
								</dt>
								<dd className="text-2xl font-bold">
									{metrics.average_grade.toFixed(2)}
								</dd>
							</div>
						</div>

						{algorithmParameters && (
							<>
								<Separator className="my-4" />
								<div>
									<h4 className="text-sm font-medium text-muted-foreground mb-3">
										Algorithm Parameters
									</h4>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<dt className="text-sm font-medium text-muted-foreground">
												Minimum Grade Required
											</dt>
											<dd className="text-lg font-medium">
												{algorithmParameters.minGrade.toFixed(
													1
												)}
											</dd>
										</div>
										<div>
											<dt className="text-sm font-medium text-muted-foreground">
												Consider Preferences
											</dt>
											<dd className="text-lg font-medium">
												{algorithmParameters.usePreference ===
												1
													? "Yes"
													: "No"}
											</dd>
										</div>
										{selectedAlgorithm === "genetic" && (
											<>
												<div>
													<dt className="text-sm font-medium text-muted-foreground">
														Number of Generations
													</dt>
													<dd className="text-lg font-medium">
														{
															algorithmParameters.generationNumber
														}
													</dd>
												</div>
												<div>
													<dt className="text-sm font-medium text-muted-foreground">
														Population Size
													</dt>
													<dd className="text-lg font-medium">
														{
															algorithmParameters.populationSize
														}
													</dd>
												</div>
											</>
										)}
									</div>
								</div>
							</>
						)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Allocation Details</CardTitle>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={columns}
						data={allocationResult.results}
						enableSorting
						enableFiltering
						enableExport
						exportFilename={`allocations_${selectedAlgorithm}`}
						filterableColumns={["class", "student", "grade"]}
					/>
				</CardContent>
			</Card>
		</div>
	);
};

export default ResultsStep;
