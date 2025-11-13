import React, { useRef } from 'react';
import { Upload, User } from 'lucide-react';

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
    <div className="flex flex-col items-center gap-2">
      {/* Avatar */}
      <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        {preview ? (
          <img 
            src={preview} 
            alt="Avatar del cliente" 
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-12 h-12 text-gray-400 dark:text-gray-500" />
        )}
      </div>

      {/* Botón de cambiar/subir imagen */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
      >
        <Upload className="w-3.5 h-3.5" />
        {preview ? 'Cambiar imagen' : 'Subir imagen'}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {imagenes[0]?.name}
        </p>
      )}
    </div>
  );
};

export default ClienteAvatar;
