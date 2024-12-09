import * as XLSX from "xlsx";
import { ValidationResult } from "./types";

export interface TemplateColumn {
    header: string;
    value: any;
}

export type ValidateDataFn<T> = (data: T[]) => ValidationResult;

export function downloadTemplate(
    templateData: Record<string, any>[],
    filename: string,
    format: "csv" | "xlsx"
) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, "Template");

    if (format === "csv") {
        // Use XLSX's built-in CSV conversion which handles encoding better
        XLSX.writeFile(wb, `${filename}.csv`, { bookType: "csv" });
    } else {
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }
}

export async function processFile<T>(
    file: File,
    requiredColumns: string[],
    validateData: ValidateDataFn<T>
): Promise<{ data: T[]; errors: string[] }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (event: ProgressEvent<FileReader>) => {
            try {
                let headers: string[];
                let parsedRows: any[];

                if (file.name.endsWith(".csv")) {
                    // Try to handle the file as a binary Excel-compatible CSV
                    try {
                        const arrayBuffer = event.target?.result as ArrayBuffer;
                        const data = new Uint8Array(arrayBuffer);
                        const workbook = XLSX.read(data, { type: "array" });
                        const sheetName = workbook.SheetNames[0];
                        const sheet = workbook.Sheets[sheetName];
                        parsedRows = XLSX.utils.sheet_to_json(sheet);
                        headers = Object.keys(parsedRows[0] || {});
                    } catch (error) {
                        // If XLSX parsing fails, fall back to text parsing with Windows-1252 encoding
                        const text = event.target?.result as string;
                        const decoder = new TextDecoder('windows-1252');
                        const decodedText = decoder.decode(new Uint8Array(text as unknown as ArrayBuffer));

                        const rows = decodedText.split(/\r?\n/);
                        headers = rows[0].split(",").map((header) => header.trim());

                        parsedRows = rows
                            .slice(1)
                            .filter((row) => row.trim())
                            .map((row) => {
                                const values = row.split(",").map((value) => value.trim());
                                return headers.reduce((obj, header, index) => {
                                    obj[header] = values[index];
                                    return obj;
                                }, {} as Record<string, string>);
                            });
                    }
                } else {
                    const arrayBuffer = event.target?.result as ArrayBuffer;
                    const workbook = XLSX.read(arrayBuffer, { type: "array" });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    parsedRows = XLSX.utils.sheet_to_json(sheet);
                    headers = Object.keys(parsedRows[0] || {});
                }

                // Check if all required columns are present
                const missingColumns = requiredColumns.filter(
                    (col) => !headers.includes(col)
                );
                if (missingColumns.length > 0) {
                    resolve({
                        data: [],
                        errors: [`Missing required columns: ${missingColumns.join(", ")}`],
                    });
                    return;
                }

                // Validate the data
                const validation = validateData(parsedRows);
                if (!validation.isValid) {
                    resolve({
                        data: [],
                        errors: validation.errors,
                    });
                    return;
                }

                resolve({
                    data: parsedRows as T[],
                    errors: [],
                });
            } catch (error) {
                reject(new Error("Failed to process file. Please ensure it matches the template format."));
            }
        };

        // Read CSV files as ArrayBuffer instead of text
        if (file.name.endsWith(".csv")) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
}
