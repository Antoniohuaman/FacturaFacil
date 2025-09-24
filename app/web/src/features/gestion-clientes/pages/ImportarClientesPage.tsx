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

const ImportarClientesPage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const PRIMARY_COLOR = '#0040A2';
  const PRIMARY_LIGHT = '#E6F0FF';
  const SUCCESS_COLOR = '#10B981';
  const ERROR_COLOR = '#EF4444';

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
      // Aquí iría la lógica de procesamiento del archivo
      console.log('Procesando archivo:', selectedFile.name);
    }
  };

  const downloadTemplate = () => {
    // Aquí iría la lógica para descargar la plantilla
    console.log('Descargando plantilla...');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => window.history.back()}
            >
              <ArrowLeft size={20} style={{ color: PRIMARY_COLOR }} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Importar clientes</h1>
              <p className="text-gray-600 mt-1">Carga masiva de clientes desde un archivo Excel</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Info size={16} className="mr-2" />
              Ver instrucciones
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Instructions Panel */}
        {showInstructions && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Info size={20} style={{ color: PRIMARY_COLOR }} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">¿Necesitas ayuda para crear tu archivo excel?</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>• El archivo debe ser formato Excel (.xlsx o .xls)</p>
                    <p>• La primera fila debe contener los nombres de las columnas</p>
                    <p>• Columnas requeridas: Nombre, Documento, Email, Teléfono</p>
                    <p>• Máximo 1000 registros por importación</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="p-1 hover:bg-blue-200 rounded-lg transition-colors"
              >
                <X size={16} className="text-blue-600" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Selecciona tu archivo</h2>
              
              {/* File Drop Zone */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                  dragActive 
                    ? 'border-blue-400 bg-blue-50' 
                    : selectedFile
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
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
                      <div className="p-3 bg-green-100 rounded-full">
                        <CheckCircle2 size={24} className="text-green-600" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="flex items-center justify-center space-x-3">
                      <button
                        onClick={handleUpload}
                        className="px-6 py-2 text-white rounded-lg font-medium transition-colors"
                        style={{ backgroundColor: PRIMARY_COLOR }}
                        onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#003380'}
                        onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = PRIMARY_COLOR}
                      >
                        Subir archivo Excel
                      </button>
                      <button
                        onClick={removeFile}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Cambiar archivo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <FileSpreadsheet size={32} className="text-gray-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Selecciona tu archivo
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Arrastra y suelta tu archivo Excel aquí o haz clic para seleccionar
                      </p>
                      <button
                        onClick={openFileDialog}
                        className="px-6 py-3 text-white rounded-lg font-medium transition-colors inline-flex items-center"
                        style={{ backgroundColor: PRIMARY_COLOR }}
                        onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#003380'}
                        onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = PRIMARY_COLOR}
                      >
                        <Upload size={18} className="mr-2" />
                        Subir tu archivo Excel
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Formatos soportados: .xlsx, .xls (máximo 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Template Download */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-center">
                <div className="p-3 bg-green-100 rounded-full inline-flex mb-4">
                  <Download size={24} className="text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">¿Necesitas ayuda?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Descarga nuestra plantilla para asegurar el formato correcto
                </p>
                <button
                  onClick={downloadTemplate}
                  className="w-full px-4 py-2 border-2 rounded-lg font-medium transition-colors flex items-center justify-center"
                  style={{ 
                    borderColor: SUCCESS_COLOR,
                    color: SUCCESS_COLOR
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = SUCCESS_COLOR;
                    (e.target as HTMLButtonElement).style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                    (e.target as HTMLButtonElement).style.color = SUCCESS_COLOR;
                  }}
                >
                  <Download size={16} className="mr-2" />
                  Descargar plantilla
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Información</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users size={16} className="text-gray-500" />
                    <span className="text-sm text-gray-600">Clientes actuales</span>
                  </div>
                  <span className="font-medium text-gray-900">1,247</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText size={16} className="text-gray-500" />
                    <span className="text-sm text-gray-600">Última importación</span>
                  </div>
                  <span className="text-sm text-gray-500">15 ene 2024</span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-yellow-800 text-sm mb-1">Consejos importantes</h4>
                  <ul className="text-xs text-yellow-700 space-y-1">
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