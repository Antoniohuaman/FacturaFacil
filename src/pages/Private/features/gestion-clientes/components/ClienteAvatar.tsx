import React, { useRef } from 'react';
import { Trash2, Upload, Image as ImageIcon } from 'lucide-react';

type ClienteAvatarProps = {
  imagenes: File[];
  onChange: (imagenes: File[]) => void;
};

const ClienteAvatar: React.FC<ClienteAvatarProps> = ({ imagenes, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  // Generar preview de la primera imagen
  React.useEffect(() => {
    if (imagenes.length > 0) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(imagenes[0]);
    } else {
      setPreview(null);
    }
  }, [imagenes]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp') {
        // Si ya hay imágenes, reemplazar la primera; si no, agregar
        const updatedImages = imagenes.length > 0 
          ? [file, ...imagenes.slice(1)]
          : [file];
        onChange(updatedImages);
      }
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Imagen principal - cuadrada/rectangular */}
      <div className="relative w-24 h-28 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        {preview ? (
          <img src={preview} alt="Cliente" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
        )}
      </div>

      {/* Botón de carga */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center justify-center gap-1 h-7 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Upload className="w-3 h-3" />
        {preview ? 'Cambiar' : 'Subir'}
      </button>

      {preview && imagenes[0] && (
        <div className="flex items-center gap-1.5 max-w-[96px]">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={imagenes[0].name}>
            {imagenes[0].name}
          </p>
          <button
            type="button"
            onClick={() => onChange([])}
            className="h-6 w-6 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Eliminar imagen"
            title="Eliminar imagen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ClienteAvatar;
