import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTableColumn } from "@/components/widgets/data-table";
import { DataTable } from "@/components/widgets/data-table";

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
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Summary Metrics</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className="grid grid-cols-3 gap-4">
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
					</dl>
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
