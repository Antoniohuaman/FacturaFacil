import React, { useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';

type ArchivosInputProps = {
  archivos: File[];
  onChange: (archivos: File[]) => void;
  maxArchivos?: number;
};

const ArchivosInput: React.FC<ArchivosInputProps> = ({ archivos, onChange, maxArchivos = 10 }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const validFiles = newFiles.filter(file => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return ext && ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx', 'xls', 'xlsx'].includes(ext);
      });
      
      const totalFiles = archivos.length + validFiles.length;
      if (totalFiles <= maxArchivos) {
        onChange([...archivos, ...validFiles]);
      } else {
        const remaining = maxArchivos - archivos.length;
        onChange([...archivos, ...validFiles.slice(0, remaining)]);
      }
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (index: number) => {
    onChange(archivos.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      return <ImageIcon className="w-4 h-4 text-blue-500" />;
    }
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="space-y-2">
      {/* Lista de archivos */}
      {archivos.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {archivos.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              {getFileIcon(file.name)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white truncate">{file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botón de carga */}
      {archivos.length < maxArchivos && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors text-gray-600 dark:text-gray-400"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm">
              {archivos.length === 0 
                ? 'Subir archivos (PDF, imágenes, documentos)'
                : `Agregar más (${archivos.length}/${maxArchivos})`
              }
            </span>
          </button>
        </>
      )}

      {archivos.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Formatos: PDF, JPG, PNG, WEBP, DOC, XLS
        </p>
      )}
    </div>
  );
};

export default ArchivosInput;
