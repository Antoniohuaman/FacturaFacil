import { Download } from 'lucide-react';

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

// Utilidad para exportar a Excel (mock - reemplazar con librería real)
export const exportToExcel = async (
  data: any[],
  filename: string,
  onProgress?: (progress: number) => void
): Promise<void> => {
  // Simular procesamiento en lotes
  const batchSize = 200;
  const totalBatches = Math.ceil(data.length / batchSize);

  for (let i = 0; i < totalBatches; i++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    const progress = Math.round(((i + 1) / totalBatches) * 100);
    onProgress?.(progress);
  }

  // TODO: Implementar exportación real con librería como xlsx o exceljs
  console.log(`Exportando ${data.length} registros a ${filename}.xlsx`);
  
  // Mock: crear CSV como fallback
  const csv = convertToCSV(data);
  downloadFile(csv, `${filename}.csv`, 'text/csv');
};

const convertToCSV = (data: any[]): string => {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
