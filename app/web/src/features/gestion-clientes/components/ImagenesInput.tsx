import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';

type ImagenesInputProps = {
  imagenes: File[];
  onChange: (imagenes: File[]) => void;
  maxImagenes?: number;
};

const ImagenesInput: React.FC<ImagenesInputProps> = ({ 
  imagenes, 
  onChange,
  maxImagenes = 5 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<{ [key: string]: string }>({});

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const availableSlots = maxImagenes - imagenes.length;
      
      if (availableSlots <= 0) {
        alert(`Solo puedes subir un máximo de ${maxImagenes} imágenes`);
        return;
      }

      const newFiles = Array.from(files)
        .slice(0, availableSlots)
        .filter((file) => {
          const ext = file.name.split('.').pop()?.toLowerCase();
          return ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp';
        });

      if (newFiles.length > 0) {
        const updatedImages = [...imagenes, ...newFiles];
        onChange(updatedImages);

        // Generar previews
        newFiles.forEach((file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            setPreviews((prev) => ({
              ...prev,
              [file.name]: e.target?.result as string,
            }));
          };
          reader.readAsDataURL(file);
        });
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (index: number) => {
    const fileToRemove = imagenes[index];
    const updated = imagenes.filter((_, i) => i !== index);
    onChange(updated);

    // Eliminar preview
    setPreviews((prev) => {
      const newPreviews = { ...prev };
      delete newPreviews[fileToRemove.name];
      return newPreviews;
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Generar previews para archivos existentes
  React.useEffect(() => {
    imagenes.forEach((file) => {
      if (!previews[file.name]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviews((prev) => ({
            ...prev,
            [file.name]: e.target?.result as string,
          }));
        };
        reader.readAsDataURL(file);
      }
    });
  }, [imagenes, previews]);

  return (
    <div className="space-y-2">
      {/* Grid de miniaturas */}
      {imagenes.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {imagenes.map((file, index) => (
            <div
              key={index}
              className="relative group aspect-square bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
            >
              {previews[file.name] ? (
                <img
                  src={previews[file.name]}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all">
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar imagen"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-white font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-300">{formatFileSize(file.size)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botón de subir */}
      {imagenes.length < maxImagenes && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
        >
          <Upload className="h-4 w-4" />
          <span>
            Seleccionar imágenes ({imagenes.length}/{maxImagenes})
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Formatos permitidos: JPG, PNG, WebP • Máximo {maxImagenes} imágenes
      </p>
    </div>
  );
};

export default ImagenesInput;
