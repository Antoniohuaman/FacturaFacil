import React from 'react';
import { FileText, Weight } from 'lucide-react';
import type { ProductFormData } from '../../models/types';
import type { FormError } from '../../hooks/useProductForm';

interface ProductDescriptionSectionProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  errors: FormError;
  isFieldVisible: (fieldId: string) => boolean;
  isFieldRequired: (fieldId: string) => boolean;
  isDescriptionExpanded: boolean;
  onToggleDescription: () => void;
}

export const ProductDescriptionField: React.FC<ProductDescriptionSectionProps> = ({
  formData,
  setFormData,
  errors,
  isFieldVisible,
  isFieldRequired,
  isDescriptionExpanded,
  onToggleDescription
}) => {
  return (
    <>
      {isFieldVisible('descripcion') && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="descripcion" className="text-xs font-medium text-gray-700">
              Descripción
              {isFieldRequired('descripcion') && <span className="text-red-500 ml-1">*</span>}
            </label>
            <button
              type="button"
              onClick={onToggleDescription}
              className="text-xs text-violet-600 hover:text-violet-700 font-medium"
            >
              {isDescriptionExpanded ? 'Contraer' : 'Expandir'}
            </button>
          </div>
          <div className="relative">
            <FileText className="absolute left-3 top-3 w-3.5 h-3.5 text-gray-400" />
            <textarea
              id="descripcion"
              rows={isDescriptionExpanded ? 6 : 3}
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 resize-none"
              placeholder="Descripción detallada..."
            />
          </div>
          {errors.descripcion && <p className="text-red-600 text-xs mt-1">{errors.descripcion}</p>}
        </div>
      )}
    </>
  );
};

interface ProductWeightFieldProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  errors: FormError;
  isFieldVisible: (fieldId: string) => boolean;
  isFieldRequired: (fieldId: string) => boolean;
}

export const ProductWeightField: React.FC<ProductWeightFieldProps> = ({
  formData,
  setFormData,
  errors,
  isFieldVisible,
  isFieldRequired
}) => {
  if (!isFieldVisible('peso')) return null;

  return (
    <div>
      <label htmlFor="peso" className="block text-xs font-medium text-gray-700 mb-1">
        Peso (KGM)
        {isFieldRequired('peso') && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="number"
          id="peso"
          step="0.001"
          min="0"
          value={formData.peso}
          onChange={(e) => setFormData(prev => ({ ...prev, peso: parseFloat(e.target.value) || 0 }))}
          className="w-full h-9 pl-9 pr-12 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
          placeholder="0.000"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">KG</div>
      </div>
      {errors.peso && <p className="text-red-600 text-xs mt-1">{errors.peso}</p>}
    </div>
  );
};
