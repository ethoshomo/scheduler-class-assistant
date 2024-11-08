import React from 'react';
import * as XLSX from 'xlsx';

// Define interfaces for our data structures
interface DataRow {
  [key: string]: string | number | boolean | Date | null;
}

interface TableWithExportProps {
  data: DataRow[];
  flatHeaders: string[];
  fileName?: string;
}

// Utility function to convert data to CSV
const convertToCSV = (data: DataRow[]): string => {
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        let cell = row[header];
        
        // Convert different types to string representation
        if (cell instanceof Date) {
          cell = cell.toISOString();
        } else if (cell === null) {
          cell = '';
        } else {
          cell = String(cell);
        }
        
        // Handle cells that contain commas or quotes
        if (cell.includes(',') || cell.includes('"')) {
          cell = `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    )
  ];
  return csvRows.join('\n');
};

// Utility function to download file
const downloadFile = (
  content: string | Blob,
  fileName: string,
  fileType: string
): void => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: fileType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Example table component with export functionality
const TableWithExport: React.FC<TableWithExportProps> = ({
  data,
  flatHeaders,
  fileName = 'table-data'
}) => {
  const handleExportXLSX = (): void => {
    // Create worksheet from data
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Create workbook and add worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    
    // Generate XLSX file and trigger download
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const handleExportCSV = (): void => {
    const csv = convertToCSV(data);
    downloadFile(csv, `${fileName}.csv`, 'text/csv');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={handleExportXLSX}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          type="button"
        >
          Export to XLSX
        </button>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          type="button"
        >
          Export to CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-200">
          <thead>
            <tr>
              {flatHeaders.map((header, index) => (
                <th
                  key={index}
                  className="border border-gray-200 p-2 bg-gray-50 text-left"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {Object.values(row).map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="border border-gray-200 p-2"
                  >
                    {cell instanceof Date ? cell.toLocaleDateString() : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Example usage with TypeScript
const ExampleUsage: React.FC = () => {
  const data: DataRow[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com', joinDate: new Date('2024-01-01') },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', joinDate: new Date('2024-02-01') },
  ];

  const headers = ['ID', 'Name', 'Email', 'Join Date'];

  return (
    <TableWithExport
      data={data}
      flatHeaders={headers}
      fileName="user-data"
    />
  );
};

export default ExampleUsage;
