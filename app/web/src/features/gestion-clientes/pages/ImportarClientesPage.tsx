/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Download,
  ArrowLeft,
  FileSpreadsheet,
  AlertCircle,
  X,
  FileText,
  Users,
  Info
} from 'lucide-react';
import { useCaja } from '../../control-caja/context/CajaContext';

const ImportarClientesPage = () => {
  const navigate = useNavigate();
  const { showToast } = useCaja();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const PRIMARY_COLOR = '#1478D4';

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
        showToast('success', '¡Archivo seleccionado!', `${file.name} está listo para importar`);
      } else {
        showToast('error', 'Tipo de archivo inválido', 'Por favor selecciona un archivo Excel (.xlsx o .xls)');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      showToast('success', '¡Archivo seleccionado!', `${file.name} está listo para importar`);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      showToast('warning', 'Sin archivo', 'Por favor selecciona un archivo Excel para importar');
      return;
    }

    setImporting(true);

    try {
      // Simular procesamiento (en producción aquí iría la llamada a la API)
      await new Promise(resolve => setTimeout(resolve, 2000));

      showToast('info', 'Función no implementada', 'La importación de clientes desde Excel estará disponible próximamente. Por favor, agrega los clientes manualmente.');
      setSelectedFile(null);
    } catch (error) {
      showToast('error', 'Error al importar', 'Ocurrió un error al procesar el archivo');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    showToast('info', 'Plantilla no disponible', 'La descarga de plantilla estará disponible próximamente');
  };

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/clientes')}
          className={iconButtonClass}
          title="Volver a Clientes"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Importar Clientes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Importa múltiples clientes desde un archivo Excel
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zona de carga */}
        <div className="lg:col-span-2 space-y-6">
          <div className={cardClass}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Archivo de Clientes</h2>
                <button
                  onClick={handleDownloadTemplate}
                  className={buttonOutlineClass}
                  style={{ borderColor: PRIMARY_COLOR, color: PRIMARY_COLOR }}
                >
                  <Download className="w-4 h-4 inline mr-2" />
                  Descargar Plantilla
                </button>
              </div>

              {/* Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200
                  ${dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <FileSpreadsheet className="w-16 h-16 text-green-500 mb-4" />
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                    >
                      <X className="w-4 h-4 inline mr-1" />
                      Eliminar archivo
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Arrastra y suelta tu archivo aquí
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Formatos soportados: .xlsx, .xls
                    </p>
                  </div>
                )}
              </div>

              {/* Botón de importar */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => navigate('/clientes')}
                  className={buttonSecondaryClass}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={!selectedFile || importing}
                  className={buttonPrimaryClass}
                  style={{
                    backgroundColor: (!selectedFile || importing) ? '#9CA3AF' : PRIMARY_COLOR,
                    cursor: (!selectedFile || importing) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {importing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline mr-2"></div>
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 inline mr-2" />
                      Importar Clientes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de instrucciones */}
        <div className="space-y-6">
          <div className={cardClass}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Info className="w-5 h-5 mr-2" style={{ color: PRIMARY_COLOR }} />
                  Instrucciones
                </h3>
              </div>

              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                    style={{ backgroundColor: PRIMARY_COLOR }}>
                    1
                  </div>
                  <p>Descarga la plantilla de Excel con el formato correcto</p>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                    style={{ backgroundColor: PRIMARY_COLOR }}>
                    2
                  </div>
                  <p>Completa los datos de tus clientes en el archivo</p>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                    style={{ backgroundColor: PRIMARY_COLOR }}>
                    3
                  </div>
                  <p>Arrastra el archivo o haz clic para seleccionarlo</p>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                    style={{ backgroundColor: PRIMARY_COLOR }}>
                    4
                  </div>
                  <p>Haz clic en "Importar Clientes" para procesar el archivo</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                      Campos requeridos
                    </p>
                    <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                      <li>• Nombre/Razón Social</li>
                      <li>• Tipo de Documento</li>
                      <li>• Número de Documento</li>
                      <li>• Tipo de Cliente</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className={cardClass}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Información
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Formato</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">.xlsx, .xls</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Límite</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Sin límite</span>
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
