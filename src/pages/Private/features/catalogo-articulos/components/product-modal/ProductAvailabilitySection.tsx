import React, { useMemo } from 'react';
import type { Establishment } from '../../../configuracion-sistema/modelos/Establishment';
import type { ProductFormData } from '../../models/types';

interface ProductAvailabilitySectionProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  establishments: Establishment[];
}

export const ProductAvailabilitySection: React.FC<ProductAvailabilitySectionProps> = ({
  formData,
  setFormData,
  establishments
}) => {
  const activeEstablishments = useMemo(
    () => establishments.filter(est => est.isActive),
    [establishments]
  );
  const selectedSet = useMemo(() => new Set(formData.establecimientoIds), [formData.establecimientoIds]);

  const selectedCount = useMemo(() => {
    let count = 0;
    activeEstablishments.forEach(est => {
      if (selectedSet.has(est.id)) {
        count += 1;
      }
    });
    return count;
  }, [activeEstablishments, selectedSet]);

  if (activeEstablishments.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-700">Disponibilidad</label>

      <div className="rounded-md border border-gray-200 bg-white p-1.5 max-h-36 overflow-y-auto">
        {activeEstablishments.map(est => {
          const checked = selectedSet.has(est.id);
          return (
            <label
              key={est.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                checked ? 'bg-violet-50' : 'hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...formData.establecimientoIds, est.id]
                    : formData.establecimientoIds.filter(id => id !== est.id);
                  setFormData(prev => ({ ...prev, establecimientoIds: Array.from(new Set(next)) }));
                }}
                className="w-3.5 h-3.5 text-violet-600 border-gray-300 rounded focus:ring-violet-500 focus:ring-1"
              />
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-700 rounded">
                {est.code}
              </span>
              <span className="text-xs font-medium text-gray-900 truncate">{est.name}</span>
            </label>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-600">
        {selectedCount} de {activeEstablishments.length} habilitado(s)
      </p>
    </div>
  );
};
