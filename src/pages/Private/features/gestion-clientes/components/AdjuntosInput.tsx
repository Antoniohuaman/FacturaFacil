import React, { useRef } from 'react';
import { Trash2, Upload } from 'lucide-react';

type AdjuntosInputProps = {
  adjuntos: File[];
  onChange: (adjuntos: File[]) => void;
};

const AdjuntosInput: React.FC<AdjuntosInputProps> = ({ adjuntos, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).filter((file) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return ext === 'pdf' || ext === 'jpg' || ext === 'jpeg' || ext === 'png';
      });
      
      onChange([...adjuntos, ...newFiles]);
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (index: number) => {
    const updated = adjuntos.filter((_, i) => i !== index);
    onChange(updated);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📄';
    return '🖼️';
  };

  return (
    <div className="space-y-2">
      {/* Lista de archivos */}
      {adjuntos.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {adjuntos.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-lg">{getFileIcon(file.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                title="Eliminar archivo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botón de subir */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
      >
        <Upload className="h-4 w-4" />
        <span>Seleccionar archivos (PDF, JPG, PNG)</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Formatos permitidos: PDF, JPG, PNG
      </p>
    </div>
  );
};

export default AdjuntosInput;
