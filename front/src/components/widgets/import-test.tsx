import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
	getSortedRowModel,
	SortingState,
} from "@tanstack/react-table";

interface DataRow {
	[key: string]: string | number;
}

const ExcelTableImport: React.FC = () => {
	const [data, setData] = useState<DataRow[]>([]);
	const [columns, setColumns] = useState<any[]>([]);
	const [sorting, setSorting] = useState<SortingState>([]);

	const columnHelper = createColumnHelper<DataRow>();

	const onDrop = (acceptedFiles: File[]) => {
		const file = acceptedFiles[0];
		const reader = new FileReader();

		reader.onload = (event) => {
			try {
				const arrayBuffer = event.target?.result as ArrayBuffer;
				const workbook = XLSX.read(arrayBuffer, { type: "array" });
				const wsname = workbook.SheetNames[0];
				const ws = workbook.Sheets[wsname];
				const data = XLSX.utils.sheet_to_json(ws) as DataRow[];

				// Generate columns from the first row of data
				if (data.length > 0) {
					const cols = Object.keys(data[0]).map((key) => {
						return columnHelper.accessor(key, {
							header: key,
							cell: (info) => info.getValue(),
						});
					});
					setColumns(cols);
					setData(data);
				}
			} catch (error) {
				console.error("Error processing file:", error);
				alert(
					"Error processing file. Please make sure it is a valid Excel or CSV file."
				);
			}
		};

		reader.onerror = (error) => {
			console.error("File reading error:", error);
			alert("Error reading file. Please try again.");
		};

		// Use readAsArrayBuffer instead of readAsBinaryString
		reader.readAsArrayBuffer(file);
	};

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
				[".xlsx"],
			"text/csv": [".csv"],
		},
	});

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return (
		<div className="p-4">
			<div
				{...getRootProps()}
				className={`p-6 mb-4 border-2 border-dashed rounded-lg text-center cursor-pointer
          ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}>
				<input {...getInputProps()} />
				{isDragActive ? (
					<p>Drop the files here ...</p>
				) : (
					<p>
						Drag 'n' drop an Excel or CSV file here, or click to
						select one
					</p>
				)}
			</div>

			{data.length > 0 && (
				<div className="overflow-x-auto">
					<table className="min-w-full border-collapse border border-gray-200">
						<thead>
							{table.getHeaderGroups().map((headerGroup) => (
								<tr key={headerGroup.id}>
									{headerGroup.headers.map((header) => (
										<th
											key={header.id}
											className="p-2 border border-gray-200 bg-gray-50"
											onClick={header.column.getToggleSortingHandler()}>
											{flexRender(
												header.column.columnDef.header,
												header.getContext()
											)}
											{{
												asc: " 🔼",
												desc: " 🔽",
											}[
												header.column.getIsSorted() as string
											] ?? null}
										</th>
									))}
								</tr>
							))}
						</thead>
						<tbody>
							{table.getRowModel().rows.map((row) => (
								<tr key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<td
											key={cell.id}
											className="p-2 border border-gray-200">
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext()
											)}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};

export default ExcelTableImport;
