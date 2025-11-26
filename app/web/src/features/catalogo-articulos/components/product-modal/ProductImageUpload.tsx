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
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {imagePreview ? (
            <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200" />
          ) : (
            <div className="w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <input type="file" accept="image/*" onChange={onUpload} className="hidden" id="image-upload" />
          <label
            htmlFor="image-upload"
            className="cursor-pointer inline-flex items-center gap-2 px-3 h-10 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Subir imagen
          </label>
          <p className="text-xs text-gray-500 mt-1.5">PNG, JPG, GIF hasta 5MB</p>
        </div>
      </div>
    </div>
  );
};
