/* eslint-disable react-refresh/only-export-components -- archivo comparte helpers y componentes; split diferido */
import { Download } from 'lucide-react';
import * as ExcelJS from 'exceljs';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
}

export interface ExcelExportOptions {
  columns?: ExcelColumn[];
  worksheetName?: string;
  textColumnKeys?: string[];
}

interface ProgressModalProps {
  isOpen: boolean;
  progress: number;
  message: string;
}

export const ProgressModal = ({ isOpen, progress, message }: ProgressModalProps) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" aria-hidden="true" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700"
          role="status"
          aria-live="polite"
        >
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Download className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-bounce" />
            </div>
          </div>

          {/* Message */}
          <p className="text-center text-gray-900 dark:text-white font-medium mb-4">
            {message}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          {/* Percentage */}
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
            {progress}%
          </p>
        </div>
      </div>
    </>
  );
};

const deriveColumnsFromData = (rows: Record<string, unknown>[], provided?: ExcelColumn[]): ExcelColumn[] => {
  if (provided && provided.length > 0) {
    return provided;
  }

  if (!rows.length) {
    return [];
  }

  const keys = Array.from(
    rows.reduce((acc, row) => {
      Object.keys(row).forEach(key => acc.add(key));
      return acc;
    }, new Set<string>())
  );

  return keys.map(key => ({
    header: key,
    key,
  }));
};

// Utilidad para exportar a Excel usando ExcelJS
export const exportToExcel = async (
  data: Record<string, unknown>[],
  filename: string,
  onProgress?: (progress: number) => void,
  options?: ExcelExportOptions
): Promise<void> => {
  const rows = data ?? [];
  const columns = deriveColumnsFromData(rows, options?.columns);

  if (columns.length === 0) {
    throw new Error('No hay columnas disponibles para exportar');
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(options?.worksheetName || 'Datos');

  worksheet.columns = columns.map(column => ({
    header: column.header,
    key: column.key,
    width: column.width ?? Math.min(64, Math.max(16, column.header.length + 6)),
  }));

  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  if (rows.length > 0) {
    rows.forEach((row, index) => {
      const normalizedRow: Record<string, unknown> = {};
      columns.forEach(column => {
        const cellValue = row[column.key];
        normalizedRow[column.key] = cellValue === undefined ? '' : cellValue;
      });
      worksheet.addRow(normalizedRow);

      if (onProgress) {
        const progress = Math.min(90, Math.max(10, Math.round(((index + 1) / rows.length) * 85)));
        onProgress(progress);
      }
    });
  } else if (onProgress) {
    onProgress(20);
  }

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FF0F172A' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  worksheet.columns?.forEach(column => {
    column.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  });

  options?.textColumnKeys?.forEach(key => {
    const column = worksheet.getColumn(key);
    column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }
      if (cell.value === null || cell.value === undefined) {
        cell.value = '';
      } else if (typeof cell.value === 'number') {
        cell.value = cell.value.toString();
      }
      cell.numFmt = '@';
    });
  });

  columns.forEach(column => {
    if (!column.numFmt) {
      return;
    }
    const excelColumn = worksheet.getColumn(column.key);
    excelColumn.numFmt = column.numFmt;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  onProgress?.(100);
};

// Utilidad para crear ZIP (mock)
export const createZipFile = async (
  files: { name: string; content: Blob }[],
  zipName: string,
  onProgress?: (progress: number) => void
): Promise<void> => {
  // Simular creación de ZIP en lotes
  const batchSize = 50;
  const totalBatches = Math.ceil(files.length / batchSize);

  for (let i = 0; i < totalBatches; i++) {
    await new Promise(resolve => setTimeout(resolve, 150));
    const progress = Math.round(((i + 1) / totalBatches) * 100);
    onProgress?.(progress);
  }

  // TODO: Implementar con librería como JSZip
  console.log(`Creando ZIP con ${files.length} archivos: ${zipName}`);
  
  // Mock: descargar primer archivo como ejemplo
  if (files.length > 0) {
    const url = URL.createObjectURL(files[0].content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${zipName}_sample.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
