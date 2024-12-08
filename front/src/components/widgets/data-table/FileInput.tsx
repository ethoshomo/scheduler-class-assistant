// components/widgets/data-table/file-input.tsx
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { downloadTemplate, processFile, ValidateDataFn } from "./FileUtils";

interface FileInputProps<T> {
	onDataChange: (data: T[]) => void;
	templateData: Record<string, any>[];
	requiredColumns: string[];
	validateData: ValidateDataFn<T>;
	templateFilename: string;
}

export function FileInput<T>({
	onDataChange,
	templateData,
	requiredColumns,
	validateData,
	templateFilename,
}: FileInputProps<T>) {
	const { toast } = useToast();

	const onDrop = async (acceptedFiles: File[]) => {
		const file = acceptedFiles[0];
		if (!file) return;

		toast({
			title: "Processing file",
			description:
				"Please wait while we validate and process your file...",
		});

		try {
			const { data, errors } = await processFile<T>(
				file,
				requiredColumns,
				validateData
			);

			if (errors.length > 0) {
				toast({
					variant: "destructive",
					title: "Error in uploaded file",
					description: (
						<div className="mt-2 max-h-[200px] overflow-y-auto">
							<ul className="list-disc pl-4 space-y-1">
								{errors.map((error, index) => (
									<li key={index} className="text-sm">
										{error}
									</li>
								))}
							</ul>
						</div>
					),
				});
				return;
			}

			onDataChange(data);
			toast({
				title: "Success",
				description: "File processed successfully",
			});
		} catch (error) {
			console.error("Error processing file:", error);
			toast({
				variant: "destructive",
				title: "Error",
				description:
					error instanceof Error
						? error.message
						: "An unknown error occurred",
			});
		}
	};

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"text/csv": [".csv"],
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
				[".xlsx"],
		},
		multiple: false,
	});

	const handleDownloadTemplate = (format: "csv" | "xlsx") => {
		downloadTemplate(templateData, templateFilename, format);
	};

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm">
							<Download className="w-4 h-4 mr-2" />
							Download Template
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem
							onClick={() => handleDownloadTemplate("csv")}>
							CSV Format
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => handleDownloadTemplate("xlsx")}>
							Excel Format
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<div
				{...getRootProps()}
				className={`
                    p-6 border-2 border-dashed rounded-lg 
                    transition-colors duration-200 ease-in-out
                    flex flex-col items-center justify-center
                    ${
						isDragActive
							? "border-primary bg-primary/5"
							: "border-border"
					}
                `}>
				<input {...getInputProps()} />
				<Upload className="w-8 h-8 mb-4 text-muted-foreground" />
				<p className="text-sm text-muted-foreground text-center">
					Drop your CSV or XLSX file here, or click to select
				</p>
				<p className="text-xs text-muted-foreground mt-2">
					Use the template button above for the correct format
				</p>
			</div>
		</div>
	);
}
