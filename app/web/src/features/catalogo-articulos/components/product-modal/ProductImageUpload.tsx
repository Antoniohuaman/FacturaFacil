import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ProductImageUploadProps {
  imagePreview: string;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isFieldVisible: (fieldId: string) => boolean;
  isFieldRequired: (fieldId: string) => boolean;
}

export const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  imagePreview,
  onUpload,
  isFieldVisible,
  isFieldRequired
}) => {
  if (!isFieldVisible('imagen')) {
    return null;
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Imagen
        {isFieldRequired('imagen') && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="rounded-lg border border-gray-200 bg-gray-50/40 p-3">
        <div className="aspect-square w-full max-h-[280px] overflow-hidden rounded-lg border border-gray-200 bg-white">
          {imagePreview ? (
            <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-xs font-medium text-gray-600">Sin imagen</p>
                <p className="text-[11px] text-gray-500">Sube una foto para identificarlo rápido</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500">PNG, JPG, GIF hasta 5MB</p>
          </div>
          <div className="flex-shrink-0">
            <input type="file" accept="image/*" onChange={onUpload} className="hidden" id="image-upload" />
            <label
              htmlFor="image-upload"
              className="cursor-pointer inline-flex items-center gap-2 px-3 h-9 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Subir imagen
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
