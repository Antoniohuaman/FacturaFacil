import React, { useRef } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';

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
      <div className="relative w-24 h-28 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
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
        className="flex items-center justify-center gap-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
      >
        <Upload className="w-3 h-3" />
        {preview ? 'Cambiar' : 'Subir'}
      </button>

      {preview && imagenes[0] && (
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[96px]" title={imagenes[0].name}>
          {imagenes[0].name}
        </p>
      )}
    </div>
  );
};

export default ClienteAvatar;
