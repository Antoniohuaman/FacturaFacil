import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import type { Establecimiento } from '../../../configuracion-sistema/modelos/Establecimiento';
import type { ProductFormData } from '../../models/types';

interface ProductAvailabilitySectionProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  Establecimientos: Establecimiento[];
  showCheck?: boolean;
  onFieldTouched?: () => void;
}

export const ProductAvailabilitySection: React.FC<ProductAvailabilitySectionProps> = ({
  formData,
  setFormData,
  Establecimientos,
  showCheck,
  onFieldTouched
}) => {
  const activeEstablecimientos = useMemo(
    () => Establecimientos.filter(est => est.estaActivoEstablecimiento !== false),
    [Establecimientos]
  );
  const selectedSet = useMemo(() => new Set(formData.establecimientoIds), [formData.establecimientoIds]);

  const selectedCount = useMemo(() => {
    let count = 0;
    activeEstablecimientos.forEach(est => {
      if (selectedSet.has(est.id)) {
        count += 1;
      }
    });
    return count;
  }, [activeEstablecimientos, selectedSet]);

  if (activeEstablecimientos.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <label className="block text-xs font-medium text-gray-700">Disponibilidad</label>
        {showCheck && (
          <Check className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-500/70" />
        )}
      </div>

      <div className="rounded-md border border-gray-200 bg-white p-1.5 max-h-36 overflow-y-auto">
        {activeEstablecimientos.map(est => {
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
                  onFieldTouched?.();
                }}
                className="w-3.5 h-3.5 text-violet-600 border-gray-300 rounded focus:ring-violet-500 focus:ring-1"
              />
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-700 rounded">
                {est.codigoEstablecimiento}
              </span>
              <span className="text-xs font-medium text-gray-900 truncate">{est.nombreEstablecimiento}</span>
            </label>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-600">
        {selectedCount} de {activeEstablecimientos.length} habilitado(s)
      </p>
    </div>
  );
};
