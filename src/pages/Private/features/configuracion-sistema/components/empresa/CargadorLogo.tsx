/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
// src/features/configuration/components/empresa/LogoUploader.tsx
import { useState, useRef } from 'react';
import { Upload, X, Image, Eye, EyeOff, Download, RotateCcw } from 'lucide-react';
import { InterruptorConfiguracion } from '../comunes/InterruptorConfiguracion';

interface LogoData {
  url: string;
  showInPrint: boolean;
}

interface LogoUploaderProps {
  logo?: LogoData;
  onLogoChange: (logo?: LogoData) => void;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  disabled?: boolean;
}

export function LogoUploader({ 
  logo, 
  onLogoChange, 
  maxSizeMB = 2,
  acceptedFormats = ['image/png', 'image/jpeg', 'image/jpg'],
  disabled = false
}: LogoUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedFormats.includes(file.type)) {
      return `Formato no soportado. Usa: ${acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}`;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      return `El archivo es muy grande. Máximo ${maxSizeMB}MB`;
    }

    return null;
  };

  const processFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Convert to base64 for preview and storage
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        onLogoChange({
          url,
          showInPrint: logo?.showInPrint ?? true
        });
        setUploading(false);
      };
      reader.onerror = () => {
        setError('Error al procesar el archivo');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setError('Error al subir el archivo');
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input value to allow re-selecting same file
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemoveLogo = () => {
    onLogoChange(undefined);
    setError(null);
  };

  const handleToggleShowInPrint = (show: boolean) => {
    if (logo) {
      onLogoChange({ ...logo, showInPrint: show });
    }
  };

  const triggerFileSelect = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const downloadLogo = () => {
    if (logo?.url) {
      const link = document.createElement('a');
      link.href = logo.url;
      link.download = 'logo-empresa';
      link.click();
    }
  };

  return (
    <div className="space-y-4">
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileSelect}
        className="sr-only"
        disabled={disabled}
      />

      {logo ? (
        /* Logo Preview */
        <div className="space-y-4">
          <div className="relative inline-block">
            <img
              src={logo.url}
              alt="Logo preview"
              className={`
                max-w-32 max-h-32 object-contain border border-gray-300 rounded-lg bg-white p-2 shadow-sm
                ${disabled ? 'opacity-50' : ''}
              `}
            />
            
            {!disabled && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
                title="Eliminar logo"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Logo Actions */}
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showPreview ? 'Ocultar' : 'Vista'} Previa</span>
            </button>

            <button
              type="button"
              onClick={downloadLogo}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Descargar</span>
            </button>

            {!disabled && (
              <button
                type="button"
                onClick={triggerFileSelect}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Cambiar</span>
              </button>
            )}
          </div>

          {/* Show in Print Toggle */}
          <div className="pt-3 border-t border-gray-200">
            <InterruptorConfiguracion
              enabled={logo.showInPrint}
              onToggle={handleToggleShowInPrint}
              label="Mostrar en Impresión"
              description="Incluir el logo en los comprobantes impresos"
              disabled={disabled}
            />
          </div>

          {/* Large Preview Modal */}
          {showPreview && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="relative bg-white rounded-lg p-6 max-w-2xl max-h-[90vh] overflow-auto">
                <button
                  onClick={() => setShowPreview(false)}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Vista Previa del Logo
                </h3>
                
                <div className="text-center">
                  <img
                    src={logo.url}
                    alt="Logo preview"
                    className="max-w-full max-h-96 object-contain border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Upload Area */
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
            ${dragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'cursor-pointer hover:bg-gray-50'
            }
            ${uploading ? 'bg-blue-50 border-blue-300' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
        >
          <div className="space-y-4">
            {uploading ? (
              <>
                <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">Procesando archivo...</p>
                  <p className="text-xs text-blue-600">Por favor espera un momento</p>
                </div>
              </>
            ) : (
              <>
                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                  dragActive ? 'bg-blue-200' : 'bg-gray-100'
                }`}>
                  {dragActive ? (
                    <Download className="w-6 h-6 text-blue-600" />
                  ) : (
                    <Upload className="w-6 h-6 text-gray-600" />
                  )}
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {dragActive ? 'Suelta el archivo aquí' : 'Subir logo'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Arrastra y suelta o haz clic para seleccionar
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* File Requirements */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Formatos soportados: {acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}</p>
        <p>• Tamaño máximo: {maxSizeMB}MB</p>
        <p>• Recomendado: Imagen cuadrada con fondo transparente</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <X className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {logo && !error && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Image className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800">Logo cargado correctamente</p>
          </div>
        </div>
      )}
    </div>
  );
}