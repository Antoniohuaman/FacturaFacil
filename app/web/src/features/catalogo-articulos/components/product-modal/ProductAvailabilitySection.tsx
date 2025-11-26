import React from 'react';
import { Building2 } from 'lucide-react';
import type { Establishment } from '../../../configuracion-sistema/models/Establishment';
import type { ProductFormData } from '../../models/types';
import type { FormError } from '../../hooks/useProductForm';

interface ProductAvailabilitySectionProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  establishments: Establishment[];
  errors: FormError;
  isEditing: boolean;
}

export const ProductAvailabilitySection: React.FC<ProductAvailabilitySectionProps> = ({
  formData,
  setFormData,
  establishments,
  errors,
  isEditing
}) => {
  const handleToggleAll = () => {
    const allSelected = formData.establecimientoIds.length === establishments.length;
    setFormData(prev => ({
      ...prev,
      establecimientoIds: allSelected ? [] : establishments.map(e => e.id)
    }));
  };

  const establishmentsToDisplay = isEditing
    ? establishments.filter(est => formData.establecimientoIds.includes(est.id))
    : establishments;
  const allSelected = formData.establecimientoIds.length === establishments.length && establishments.length > 0;

  return (
    <div className="border border-purple-300 rounded-md bg-purple-50/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-900 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-purple-600" />
          Establecimientos <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={handleToggleAll}
          className={`
            relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-purple-500
            ${allSelected ? 'bg-purple-600' : 'bg-gray-300'}
          `}
          title={allSelected ? 'Desmarcar todos' : 'Marcar todos'}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
              allSelected ? 'translate-x-4.5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {establishments.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <Building2 className="w-8 h-8 mx-auto mb-1 text-gray-300" />
            <p className="text-xs font-medium">No hay establecimientos activos</p>
          </div>
        ) : isEditing && establishmentsToDisplay.length === 0 ? (
          <div className="text-center py-4 text-amber-600 bg-amber-50 rounded border border-amber-200">
            <p className="text-xs font-medium">No hay establecimientos asignados a este producto</p>
          </div>
        ) : (
          establishmentsToDisplay.map(est => {
            const isSelected = formData.establecimientoIds.includes(est.id);
            return (
              <label
                key={est.id}
                className={`
                  flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer transition-all
                  ${
                    isSelected
                      ? 'bg-purple-100 border-purple-300'
                      : 'bg-white border-gray-200 hover:border-purple-200 hover:bg-purple-50/50'
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    const newIds = e.target.checked
                      ? [...formData.establecimientoIds, est.id]
                      : formData.establecimientoIds.filter(id => id !== est.id);
                    setFormData(prev => ({ ...prev, establecimientoIds: newIds }));
                  }}
                  className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-200 text-purple-800 rounded">
                      {est.code}
                    </span>
                    <p className="text-xs font-medium text-gray-900 truncate">{est.name}</p>
                  </div>
                </div>
                {isSelected && (
                  <svg className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </label>
            );
          })
        )}
      </div>

      {establishments.length > 0 && (
        <div className="flex items-center justify-between pt-1.5 border-t border-purple-200">
          <p className="text-[10px] text-gray-600">
            {isEditing
              ? `${formData.establecimientoIds.length} establecimiento(s) asignado(s)`
              : `${formData.establecimientoIds.length} de ${establishments.length} seleccionado(s)`}
          </p>
        </div>
      )}

      {errors.establecimientoIds && (
        <div className="flex items-center gap-1.5 p-2 bg-red-50 border border-red-300 rounded">
          <svg className="w-3.5 h-3.5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-[10px] text-red-700 font-medium">{errors.establecimientoIds}</p>
        </div>
      )}
    </div>
  );
};
