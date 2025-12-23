import * as ExcelJS from 'exceljs';

export interface SimpleExcelColumn {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
}

interface ExportDatasetParams {
  rows: Record<string, unknown>[];
  columns: SimpleExcelColumn[];
  filename: string;
  worksheetName?: string;
}

export async function exportDatasetToExcel({
  rows,
  columns,
  filename,
  worksheetName = 'Datos'
}: ExportDatasetParams): Promise<void> {
  if (!columns.length) {
    throw new Error('No hay columnas para exportar');
  }

  if (!rows.length) {
    throw new Error('No hay datos para exportar');
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(worksheetName);

  worksheet.columns = columns.map(column => ({
    header: column.header,
    key: column.key,
    width: column.width ?? Math.min(64, Math.max(16, column.header.length + 6)),
    style: column.numFmt ? { numFmt: column.numFmt } : undefined
  }));

  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  rows.forEach(row => {
    const normalizedRow: Record<string, unknown> = {};
    columns.forEach(column => {
      normalizedRow[column.key] = row[column.key];
    });
    worksheet.addRow(normalizedRow);
  });

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FF0F172A' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
  });

  worksheet.columns?.forEach(column => {
    column.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const normalizedFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = normalizedFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
