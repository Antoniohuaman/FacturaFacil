import React, { useMemo } from 'react';
import { Percent, HelpCircle } from 'lucide-react';
import type { ProductFormData } from '../../models/types';
import type { FormError } from '../../hooks/useProductForm';
import { Tooltip } from '@/shared/ui';

interface ProductPricingSectionProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  errors: FormError;
  isFieldVisible: (fieldId: string) => boolean;
  isFieldRequired: (fieldId: string) => boolean;
  taxOptions: { id: string; code: string; value: string; label: string }[];
  onBlur?: () => void;
  showCheck?: boolean;
  renderCheck?: (className?: string) => React.ReactNode;
}

export const ProductPricingSection: React.FC<ProductPricingSectionProps> = ({
  formData,
  setFormData,
  errors,
  isFieldVisible,
  isFieldRequired,
  taxOptions,
  onBlur,
  showCheck,
  renderCheck,
}) => {
  const optionsWithLegacy = useMemo(() => {
    const trimmedValue = formData.impuesto?.trim();
    if (!trimmedValue) return taxOptions;

    const existsInVisible = taxOptions.some(option => option.value === trimmedValue);
    if (existsInVisible) return taxOptions;

    // Producto con impuesto ya guardado que ahora no es visible en la configuración
    return [
      {
        id: 'legacy-impuesto',
        code: 'LEGACY',
        value: trimmedValue,
        label: `${trimmedValue} (no visible)`,
      },
      ...taxOptions,
    ];
  }, [formData.impuesto, taxOptions]);

  const impuestoVisible = isFieldVisible('impuesto');
  if (!impuestoVisible) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor="impuesto" className="flex items-center gap-2 text-xs font-medium text-gray-700">
          <span>
            Impuesto
            {isFieldRequired('impuesto') && <span className="text-red-500 ml-1">*</span>}
          </span>
          <Tooltip contenido="Elige el impuesto según el tipo de venta. IGV 18% es el más común." ubicacion="derecha">
            <button
              type="button"
              aria-label="Ayuda: Impuesto"
              className="inline-flex items-center justify-center rounded-sm text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </Tooltip>
        </label>
        {showCheck && renderCheck?.()}
      </div>
      <div className="relative">
        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <select
          id="impuesto"
          value={formData.impuesto}
          onChange={(e) => {
            const seleccionado = optionsWithLegacy.find(option => option.value === e.target.value);
            // 'legacy-impuesto' es un pseudo-id (no una Tax real, ver optionsWithLegacy arriba) —
            // nunca se persiste como impuestoId. Solo una opción real del catálogo (`Tax.id`)
            // pasa a ser la relación estructurada — fuente prioritaria de
            // `resolverTratamientoTributarioProducto` (shared/catalogos-sunat/resolucionTributaria.ts).
            const impuestoId = seleccionado && seleccionado.id !== 'legacy-impuesto' ? seleccionado.id : undefined;
            setFormData(prev => ({ ...prev, impuesto: e.target.value, impuestoId }));
          }}
          onBlur={onBlur}
          className={`w-full h-9 pl-9 pr-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 ${
            errors.impuesto ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
        >
          {/* Sin Tax predeterminado ni selección previa: no se asume ningún impuesto — se ofrece
              un placeholder explícito que exige una elección real antes de poder guardar. */}
          {!formData.impuesto && <option value="">Selecciona un impuesto…</option>}
          {optionsWithLegacy.map(option => (
            <option key={option.id} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {errors.impuesto && <p className="text-red-600 text-xs mt-1">{errors.impuesto}</p>}
    </div>
  );
};
