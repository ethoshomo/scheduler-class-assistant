import { Column, ColumnDef } from "@tanstack/react-table";

export interface FilterValue {
    id: string;
    value: string;
}

export type DataTableColumn<TData> = ColumnDef<TData, unknown> & {
    accessorKey?: string;
};

export interface DataTableProps<TData> {
    columns: DataTableColumn<TData>[];
    data: TData[];
    enableSorting?: boolean;
    enableFiltering?: boolean;
    enableExport?: boolean;
    exportFilename?: string;
    filterableColumns?: string[];
    onExport?: (format: "csv" | "xlsx") => void;
}

export interface FilterDropdownProps<TData> {
    tableColumn: Column<TData, unknown>;
    columnKey: string;
    label: string;
    values: string[];
    onFilterChange: (columnKey: string, value: string) => void;
    onClearFilters: (columnKey: string) => void;
    activeFilters?: Set<string>;
}

export interface FileInputProps<T> {
    onDataChange: (data: T[]) => void;
    templateData: Record<string, any>[];
    requiredColumns: string[];
    validateData: (data: T[]) => ValidationResult;
    templateFilename: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}
