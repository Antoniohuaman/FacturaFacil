import { useState, useRef } from 'react';
import { 
  Upload, 
  Download, 
  ArrowLeft, 
  FileSpreadsheet, 
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Users,
  Info
} from 'lucide-react';

// Tipo para el historial de importaciones
interface ImportHistory {
  id: string;
  fileName: string;
  date: Date;
  status: 'success' | 'error' | 'processing';
  recordsImported: number;
  recordsTotal: number;
  errorMessage?: string;
}

const ImportarClientesPage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para el historial de importaciones
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([
    {
      id: '1',
      fileName: 'clientes_enero_2024.xlsx',
      date: new Date('2024-01-15T10:30:00'),
      status: 'success',
      recordsImported: 150,
      recordsTotal: 150
    },
    {
      id: '2', 
      fileName: 'nuevos_clientes.xlsx',
      date: new Date('2024-01-10T14:20:00'),
      status: 'success',
      recordsImported: 75,
      recordsTotal: 80
    },
    {
      id: '3',
      fileName: 'clientes_diciembre.xlsx', 
      date: new Date('2023-12-28T09:15:00'),
      status: 'error',
      recordsImported: 0,
      recordsTotal: 200,
      errorMessage: 'Formato de archivo incorrecto'
    }
  ]);

  const PRIMARY_COLOR = '#1478D4';
  const SUCCESS_COLOR = '#10B981';

  // Clases consistentes para reutilizar
  const cardClass = "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700";
  const buttonPrimaryClass = "px-6 py-2 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-md";
  const buttonSecondaryClass = "px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg transition-all duration-200";
  const buttonOutlineClass = "px-4 py-2 border-2 rounded-lg font-medium transition-all duration-200";
  const iconButtonClass = "p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200";

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
          file.type === "application/vnd.ms-excel") {
        setSelectedFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      // Simular procesamiento del archivo
      console.log('Procesando archivo:', selectedFile.name);
      
      // Agregar al historial de importaciones
      const newImport: ImportHistory = {
        id: Date.now().toString(),
        fileName: selectedFile.name,
        date: new Date(),
        status: 'success', // En un caso real, esto dependería del resultado del procesamiento
        recordsImported: Math.floor(Math.random() * 100) + 50, // Simulado
        recordsTotal: Math.floor(Math.random() * 100) + 50 // Simulado
      };
      
      setImportHistory(prev => [newImport, ...prev]);
      
      // Limpiar archivo seleccionado
      removeFile();
    }
  };

  const downloadTemplate = () => {
    // Aquí iría la lógica para descargar la plantilla
    console.log('Descargando plantilla...');
  };

  // Función para formatear fecha corta
  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              className={iconButtonClass}
              onClick={() => window.history.back()}
            >
              <ArrowLeft size={20} style={{ color: PRIMARY_COLOR }} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Importar clientes</h1>
              <p className="text-base text-gray-600 dark:text-gray-400 mt-1">Carga masiva de clientes desde un archivo Excel</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className={buttonSecondaryClass + " flex items-center"}
            >
              <Info size={16} className="mr-2" />
              Ver instrucciones
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Instructions Panel */}
        {showInstructions && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                  <Info size={20} style={{ color: PRIMARY_COLOR }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">¿Necesitas ayuda para crear tu archivo excel?</h3>
                  <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <p>• El archivo debe ser formato Excel (.xlsx o .xls)</p>
                    <p>• La primera fila debe contener los nombres de las columnas</p>
                    <p>• Columnas requeridas: Nombre, Documento, Email, Teléfono</p>
                    <p>• Máximo 1000 registros por importación</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className={iconButtonClass}
              >
                <X size={16} className="text-blue-600 dark:text-blue-400" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Upload Area */}
          <div className="xl:col-span-3 space-y-6">
            {/* Template Download - Movido aquí arriba */}
            <div className={cardClass + " p-4"}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <Download size={20} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">¿Necesitas ayuda?</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Descarga nuestra plantilla para asegurar el formato correcto
                    </p>
                  </div>
                </div>
                <button
                  onClick={downloadTemplate}
                  className={buttonOutlineClass + " flex items-center hover:bg-green-50 dark:hover:bg-green-900/20"}
                  style={{ 
                    borderColor: SUCCESS_COLOR,
                    color: SUCCESS_COLOR
                  }}
                >
                  <Download size={14} className="mr-1" />
                  Descargar plantilla
                </button>
              </div>
            </div>
            
            <div className={cardClass + " p-6"}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Selecciona tu archivo</h2>
              
              {/* File Drop Zone */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                  dragActive 
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                    : selectedFile
                    ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                        <CheckCircle2 size={24} className="text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="flex items-center justify-center space-x-3">
                      <button
                        onClick={handleUpload}
                        className={buttonPrimaryClass}
                        style={{ backgroundColor: PRIMARY_COLOR }}
                      >
                        Subir archivo Excel
                      </button>
                      <button
                        onClick={removeFile}
                        className={buttonSecondaryClass}
                      >
                        Cambiar archivo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <div className="p-4 bg-gray-100 dark:bg-gray-600 rounded-full">
                        <FileSpreadsheet size={32} className="text-gray-600 dark:text-gray-300" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Selecciona tu archivo
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Arrastra y suelta tu archivo Excel aquí o haz clic para seleccionar
                      </p>
                      <button
                        onClick={openFileDialog}
                        className={buttonPrimaryClass + " inline-flex items-center"}
                        style={{ backgroundColor: PRIMARY_COLOR }}
                      >
                        <Upload size={18} className="mr-2" />
                        Subir tu archivo Excel
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Formatos soportados: .xlsx, .xls (máximo 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Stats */}
            <div className={cardClass + " p-6"}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Información</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users size={16} className="text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Clientes actuales</span>
                  </div>
                  <span className="text-base font-medium text-gray-900 dark:text-white">1,247</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText size={16} className="text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Última importación</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {importHistory.length > 0 ? importHistory[0].date.toLocaleDateString('es-ES') : 'Ninguna'}
                  </span>
                </div>
              </div>
            </div>

            {/* Historial de importaciones */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <h4 className="text-xs text-gray-600 dark:text-gray-400 mb-3 font-medium">Últimas importaciones</h4>
              {importHistory.length > 0 ? (
                <div className="space-y-3">
                  {importHistory.slice(0, 3).map((record, index) => (
                    <div key={record.id}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-800 font-medium">
                            {record.recordsImported} clientes
                          </p>
                          <p className="text-xs text-gray-500">{record.fileName}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-medium ${
                            record.status === 'success' ? 'text-green-600' : 
                            record.status === 'error' ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {record.status === 'success' ? 'Exitosa' : 
                             record.status === 'error' ? 'Error' : 'Parcial'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatShortDate(record.date)}
                          </p>
                        </div>
                      </div>
                      {index < Math.min(importHistory.length - 1, 2) && (
                        <div className="h-px bg-gray-200 mt-3"></div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-2">
                  No hay importaciones anteriores
                </p>
              )}
            </div>

            {/* Tips */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-base font-medium text-yellow-800 mb-1">Consejos importantes</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Revisa que no haya duplicados</li>
                    <li>• Verifica el formato de emails</li>
                    <li>• Los teléfonos deben tener formato válido</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportarClientesPage;